// js/api_service.js
(function(root) {
    'use strict';

    root.DS = root.DS || {};
    const DS = root.DS;

    DS.ApiService = {
        
        callApiInBackground: async function(payload) {
            const request = payload.type ? payload : { type: 'FETCH_API', payload };
            if (request.type === 'FETCH_API' && request.payload?.url) {
                await this.ensureHostPermission(request.payload.url);
            }

            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(request, (response) => {
                    if (chrome.runtime.lastError) { return reject(new Error(chrome.runtime.lastError.message)); }
                    if (response && response.success) { resolve(response.data); } 
                    else { reject(new Error(response?.error || '未知的后台脚本错误。')); }
                });
            });
        },

        getHostPermissionPattern: function(url) {
            let parsedUrl;
            try {
                parsedUrl = new URL((url || '').trim());
            } catch (error) {
                throw new Error('API 地址无效，请填写完整的 http:// 或 https:// 地址。');
            }

            if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
                throw new Error('API 地址仅支持 http:// 或 https:// 协议。');
            }

            return `${parsedUrl.protocol}//${parsedUrl.hostname}/*`;
        },

        hasHostPermission: async function(url) {
            if (!chrome.permissions?.contains) return true;
            const origin = this.getHostPermissionPattern(url);
            return chrome.permissions.contains({ origins: [origin] });
        },

        ensureHostPermission: async function(url) {
            const granted = await this.hasHostPermission(url);
            if (granted) return;

            const origin = this.getHostPermissionPattern(url).replace('/*', '');
            throw new Error(`未授权 API 地址 ${origin}。请在设置中选择该配置后点击“授权当前地址”。`);
        },

        requestHostPermission: async function(url) {
            const origin = this.getHostPermissionPattern(url);
            if (await this.hasHostPermission(url)) return true;
            return chrome.permissions.request({ origins: [origin] });
        },

        normalizeOpenAIChatUrl: function(url) {
            const trimmedUrl = (url || '').trim();
            const baseUrl = trimmedUrl.replace(/\/+$/, '');
            if (/\/chat\/completions$/i.test(baseUrl)) {
                return baseUrl;
            }
            if (/\/(?:api\/)?v1$/i.test(baseUrl)) {
                return `${baseUrl}/chat/completions`;
            }
            return trimmedUrl;
        },

        shouldOmitTemperature: function(model) {
            const rawModel = (model || '').toLowerCase();
            const modelName = rawModel.split('/').pop();
            return rawModel.startsWith('anthropic/')
                || /^claude(?:$|[-.])/.test(modelName)
                || /^gpt-5(?:$|[-.])/.test(modelName)
                || /^o[1-9](?:$|[-.])/.test(modelName);
        },

        createApiPayload: function(activeProfile, messages, temperature) {
            if (activeProfile.provider === 'gemini') {
                const url = `${activeProfile.url}${activeProfile.model}:generateContent?key=${activeProfile.key}`;
                const data = JSON.stringify({
                    contents: this._transformToGeminiContent(messages),
                    generationConfig: { temperature }
                });
                return {
                    url,
                    headers: { 'Content-Type': 'application/json' },
                    data
                };
            } else {
                const body = {
                    model: activeProfile.model,
                    messages: messages,
                    stream: false
                };
                if (!this.shouldOmitTemperature(activeProfile.model)) {
                    body.temperature = temperature;
                }
                const data = JSON.stringify(body);
                return {
                    url: this.normalizeOpenAIChatUrl(activeProfile.url),
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeProfile.key}` },
                    data
                };
            }
        },

        getApiResponseText: function(data, activeProfile) {
            if (activeProfile.provider === 'gemini') {
                if (data?.promptFeedback?.blockReason) {
                     throw new Error(`请求被 Gemini 阻止: ${data.promptFeedback.blockReason}`);
                }
                return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            } else {
                return (data.choices?.[0]?.message?.content || '').trim();
            }
        },

        _transformToGeminiContent: function(messages) {
            const contents = [];
            let systemInstruction = '';
            let localMessages = JSON.parse(JSON.stringify(messages));
    
            const systemMsgIndex = localMessages.findIndex(msg => msg.role === 'system');
            if (systemMsgIndex !== -1) {
                systemInstruction = localMessages[systemMsgIndex].content;
                localMessages.splice(systemMsgIndex, 1);
            }
            
            if (systemInstruction) {
                const firstUserMsg = localMessages.find(msg => msg.role === 'user');
                if (firstUserMsg) {
                    firstUserMsg.content = systemInstruction + "\n\n" + firstUserMsg.content;
                } else if (localMessages.length > 0) {
                     localMessages[0].content = systemInstruction + "\n\n" + localMessages[0].content;
                }
            }
    
            let lastRole = '';
            localMessages.forEach(msg => {
                const role = msg.role === 'assistant' ? 'model' : 'user';
                if (role === lastRole && contents.length > 0) {
                     contents[contents.length - 1].parts[0].text += "\n\n" + msg.content;
                } else {
                    contents.push({
                        role: role,
                        parts: [{ text: msg.content }]
                    });
                    lastRole = role;
                }
            });
            return contents;
        },

        // Search Specific
        getTavilyKey: function(searchSettings) {
            const keys = searchSettings.tavilyKeys.filter(k => k && k.trim());
            if (keys.length === 0) return null;
            
            let currentIndex = searchSettings.activeTavilyKeyIndex || 0;
            if (currentIndex >= keys.length) currentIndex = 0;
            
            const key = keys[currentIndex];
            
            // Update index for next time (caller should save config)
            searchSettings.activeTavilyKeyIndex = (currentIndex + 1) % keys.length;
            
            return { key, updatedSettings: searchSettings };
        }
    };

})(globalThis);
