// js/modules/chat.js
(function(window) {
    'use strict';

    window.DS = window.DS || {};

    class ChatModule {
        constructor() {
            this.conversation = [];
            this.history = [];
            this.isLoading = false;
        }

        init(historyData) {
            this.history = historyData || [];
        }

        clearSession() {
            this.conversation = [];
            this.render();
        }

        restoreSession(conversationData) {
            this.conversation = JSON.parse(JSON.stringify(conversationData));
            this.render();
        }

        render() {
            const displayArea = document.getElementById(`${DS.SCRIPT_PREFIX}-chat-output`);
            if (!displayArea) return;

            const currentCount = displayArea.querySelectorAll('[data-index]').length;
            
            if (this.conversation.length === 0) {
                displayArea.innerHTML = "";
                displayArea.appendChild(this._createWelcomeScreen());
                return;
            }

            // 只在数量不匹配时完全重绘
            if (currentCount !== this.conversation.length) {
                displayArea.innerHTML = "";
                this.conversation.forEach((msg, idx) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = `${DS.SCRIPT_PREFIX}-chat-message-wrapper ${msg.role === 'user' ? DS.SCRIPT_PREFIX + '-user-wrapper' : DS.SCRIPT_PREFIX + '-assistant-wrapper'}`;
                    wrapper.dataset.index = idx;
                    
                    const bubble = document.createElement('div');
                    bubble.className = `${DS.SCRIPT_PREFIX}-chat-message ${msg.role === 'user' ? DS.SCRIPT_PREFIX + '-user-message' : DS.SCRIPT_PREFIX + '-assistant-message'}`;
                    
                    if (msg.role === 'assistant') {
                        DS.utils.renderMarkdown(msg.content, bubble);
                    } else {
                        bubble.textContent = msg.content;
                    }
                    
                    wrapper.appendChild(bubble);
                    displayArea.appendChild(wrapper);
                });
            }

            this._syncLoadingIndicator(displayArea);

            displayArea.scrollTop = displayArea.scrollHeight;
        }

        _syncLoadingIndicator(displayArea) {
            if (!displayArea) return;

            const loaderSelector = `.${DS.SCRIPT_PREFIX}-loading-indicator`;
            const existingLoader = displayArea.querySelector(loaderSelector);

            if (this.isLoading) {
                if (!existingLoader) {
                    DS.utils.showLoadingIndicator('AI 正在思考...', displayArea);
                }
                return;
            }

            if (existingLoader) {
                existingLoader.remove();
            }
        }

        _appendMessage(msg) {
            const displayArea = document.getElementById(`${DS.SCRIPT_PREFIX}-chat-output`);
            if (!displayArea) return;
            
            const welcome = displayArea.querySelector(`.${DS.SCRIPT_PREFIX}-welcome-screen`);
            if (welcome) welcome.remove();
            
            const wrapper = document.createElement('div');
            wrapper.className = `${DS.SCRIPT_PREFIX}-chat-message-wrapper ${msg.role === 'user' ? DS.SCRIPT_PREFIX + '-user-wrapper' : DS.SCRIPT_PREFIX + '-assistant-wrapper'}`;
            wrapper.dataset.index = this.conversation.length - 1;
            
            const bubble = document.createElement('div');
            bubble.className = `${DS.SCRIPT_PREFIX}-chat-message ${msg.role === 'user' ? DS.SCRIPT_PREFIX + '-user-message' : DS.SCRIPT_PREFIX + '-assistant-message'}`;
            
            if (msg.role === 'assistant') {
                DS.utils.renderMarkdown(msg.content, bubble);
            } else {
                bubble.textContent = msg.content;
            }
            
            wrapper.appendChild(bubble);
            displayArea.appendChild(wrapper);
            displayArea.scrollTop = displayArea.scrollHeight;
        }

        _createWelcomeScreen() {
            const screen = document.createElement('div');
            screen.className = `${DS.SCRIPT_PREFIX}-welcome-screen`;
            screen.innerHTML = `
                <div class="${DS.SCRIPT_PREFIX}-welcome-icon">${DS.ICONS.CHAT}</div>
                <h1 class="${DS.SCRIPT_PREFIX}-welcome-title">AI 聊天</h1>
                <p class="${DS.SCRIPT_PREFIX}-welcome-subtext">有什么可以帮您？开始一段对话吧</p>
            `;
            return screen;
        }

        async sendMessage(text, config) {
            if (!text?.trim()) return;

            if (this.isLoading) {
                DS.utils.showToast('正在生成上一条回复，请稍候再发送。', 'error');
                return;
            }

            if (!config.apiProfiles || !Array.isArray(config.apiProfiles) || config.apiProfiles.length === 0) {
                DS.utils.showToast("请在设置中配置聊天 API", "error");
                return;
            }

            const activeProfileId = config.activeChatProfileId;
            const activeProfile = config.apiProfiles.find(p => p.id === activeProfileId);
            
            if (!activeProfile || !activeProfile.key?.trim()) {
                DS.utils.showToast("请在设置中配置聊天 API", "error");
                return;
            }

            this.conversation.push({ role: 'user', content: text });
            this.isLoading = true;
            this._appendMessage({ role: 'user', content: text });
            
            const displayArea = document.getElementById(`${DS.SCRIPT_PREFIX}-chat-output`);
            this._syncLoadingIndicator(displayArea);

            const context = this.conversation.slice(-10); // Keep last 10
            const payload = DS.ApiService.createApiPayload(activeProfile, context, 0.7);

            try {
                const response = await DS.ApiService.callApiInBackground(payload);
                const data = JSON.parse(response.text);
                const aiResponse = DS.ApiService.getApiResponseText(data, activeProfile);

                if (!aiResponse) throw new Error('API返回内容为空。');

                this.conversation.push({ role: 'assistant', content: aiResponse });
                this._appendMessage({ role: 'assistant', content: aiResponse });
                
                // Add copy to history
                this.history.unshift(JSON.parse(JSON.stringify(this.conversation)));
                if (this.history.length > config.maxHistoryItems) this.history.pop();
                
                await DS.storage.set({ chatHistory: this.history });

            } catch (e) {
                DS.utils.showToast(`请求失败: ${e.message}`, "error");
            } finally {
                this.isLoading = false;
                const displayArea = document.getElementById(`${DS.SCRIPT_PREFIX}-chat-output`);
                this._syncLoadingIndicator(displayArea);
            }
        }
    }

    DS.ChatModule = new ChatModule();

})(window);
