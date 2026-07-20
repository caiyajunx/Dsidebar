// js/modules/translate.js
(function(window) {
    'use strict';

    window.DS = window.DS || {};

    class TranslateModule {
        constructor() {
            this.session = [];
            this.history = [];
            this.isLoading = false;
        }

        init(historyData) {
            this.history = historyData || [];
        }

        clearSession() {
            this.session = [];
            this.render();
        }

        restoreSession(sessionItem) {
            this.session = [sessionItem];
            this.render();
        }

        render() {
            const displayArea = document.getElementById(`${DS.SCRIPT_PREFIX}-translate-output`);
            if (!displayArea) return;

            const currentCount = displayArea.querySelectorAll('[data-id]').length;
            
            if (this.session.length === 0) {
                displayArea.innerHTML = "";
                displayArea.appendChild(this._createWelcomeScreen());
                return;
            }

            // 只在数量不匹配时完全重绘（clearSession/restoreSession）
            if (currentCount !== this.session.length) {
                displayArea.innerHTML = "";
                this.session.forEach(item => {
                    const itemDiv = this._createResultBlock(item.original, item.translation, item.isTranslating, item.error);
                    itemDiv.dataset.id = item.id;
                    displayArea.appendChild(itemDiv);
                });
                displayArea.scrollTop = displayArea.scrollHeight;
            }
        }

        _appendResult(item) {
            const displayArea = document.getElementById(`${DS.SCRIPT_PREFIX}-translate-output`);
            if (!displayArea) return;
            
            const welcome = displayArea.querySelector(`.${DS.SCRIPT_PREFIX}-welcome-screen`);
            if (welcome) welcome.remove();
            
            const itemDiv = this._createResultBlock(item.original, item.translation, item.isTranslating, item.error);
            itemDiv.dataset.id = item.id;
            displayArea.appendChild(itemDiv);
            displayArea.scrollTop = displayArea.scrollHeight;
        }

        _updateResult(itemId) {
            const displayArea = document.getElementById(`${DS.SCRIPT_PREFIX}-translate-output`);
            if (!displayArea) return;
            
            const existingDiv = displayArea.querySelector(`[data-id="${itemId}"]`);
            if (!existingDiv) return;
            
            const item = this.session.find(i => i.id === itemId);
            if (!item) return;
            
            const newDiv = this._createResultBlock(item.original, item.translation, item.isTranslating, item.error);
            newDiv.dataset.id = itemId;
            existingDiv.replaceWith(newDiv);
        }

        _createWelcomeScreen() {
            const screen = document.createElement('div');
            screen.className = `${DS.SCRIPT_PREFIX}-welcome-screen`;
            screen.innerHTML = `
                <div class="${DS.SCRIPT_PREFIX}-welcome-icon">${DS.ICONS.TRANSLATE}</div>
                <p class="${DS.SCRIPT_PREFIX}-welcome-subtext">在下方输入框粘贴或输入文本开始翻译</p>
                <p class="${DS.SCRIPT_PREFIX}-welcome-hint">提示：在支持的网页上按住Alt时选择文本或使用右键菜单可快速翻译。</p>
            `;
            return screen;
        }

        _createResultBlock(original, translation, isTranslating, error) {
            const wrapper = document.createElement('div');
            wrapper.className = 'dsider-card'; // Use the CSS class defined in style.css
            
            // Remove inline styles that conflict with CSS class or are redundant
            // wrapper.style.display = 'flex'; ... (Let CSS handle if needed, or keep for layout)
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.gap = '12px'; // Reduced gap
            
            // Original Section
            const originalSection = document.createElement('div');
            const originalLabel = document.createElement('div');
            originalLabel.textContent = '原文:';
            originalLabel.className = 'dsider-card-label'; // Use CSS class
            
            const originalContent = document.createElement('div');
            originalContent.textContent = original;
            originalContent.className = 'dsider-card-content'; // Use CSS class
            
            originalSection.appendChild(originalLabel);
            originalSection.appendChild(originalContent);
            wrapper.appendChild(originalSection);

            // Divider
            const divider = document.createElement('div');
            divider.className = 'dsider-card-divider'; // New CSS class
            wrapper.appendChild(divider);

            // Translation Section
            const translationSection = document.createElement('div');
            
            if (isTranslating) {
                // Loading State
                translationSection.innerHTML = `
                    <div class="dsider-card-label" style="color:var(--accent-primary)">正在翻译...</div>
                    <div style="display:flex; align-items:center; gap:6px; margin-top:8px;">
                        <div class="dot" style="width:6px;height:6px;background:var(--accent-primary);border-radius:50%;animation:bounce 1.4s infinite ease-in-out both;"></div>
                        <div class="dot" style="width:6px;height:6px;background:var(--accent-primary);border-radius:50%;animation:bounce 1.4s infinite ease-in-out both;animation-delay:-0.16s;"></div>
                        <div class="dot" style="width:6px;height:6px;background:var(--accent-primary);border-radius:50%;animation:bounce 1.4s infinite ease-in-out both;animation-delay:-0.32s;"></div>
                    </div>
                `;
            } else if (error) {
                // Error State
                translationSection.innerHTML = `
                    <div class="dsider-card-label" style="color:var(--error-color)">翻译失败</div>
                    <div class="dsider-card-content" style="color:var(--error-color)">${DS.utils.escapeHtml(error)}</div>
                `;
            } else {
                // Completed State
                const translationLabel = document.createElement('div');
                translationLabel.textContent = '译文 (中文):'; 
                translationLabel.className = 'dsider-card-label';
                
                const translationContent = document.createElement('div');
                translationContent.className = `dsider-card-content translation ${DS.SCRIPT_PREFIX}-assistant-message`;
                DS.utils.renderMarkdown(translation || '', translationContent);

                translationSection.appendChild(translationLabel);
                translationSection.appendChild(translationContent);
            }

            wrapper.appendChild(translationSection);
            return wrapper;
        }

        async translateText(text, config) {
            if (!text?.trim()) return;
            
            // Check Profile
            if (!config.apiProfiles || !Array.isArray(config.apiProfiles) || config.apiProfiles.length === 0) {
                DS.utils.showToast("请在设置中配置翻译 API", "error");
                return;
            }
            
            const activeProfileId = config.activeTranslateProfileId;
            const activeProfile = config.apiProfiles.find(p => p.id === activeProfileId);
            
            if (!activeProfile || !activeProfile.key?.trim()) {
                DS.utils.showToast("请在设置中配置翻译 API", "error");
                return;
            }

            // 1. Create a "pending" entry
            // We use a unique ID (timestamp) to update it later if needed, though session index is enough
            const entry = { 
                id: Date.now(),
                original: text, 
                translation: null, // Indicates pending
                isTranslating: true 
            };
            this.session.push(entry);
            
            this.isLoading = true;
            this._appendResult(entry); // 增量追加，不重绘整个列表

            const p = config.translationPrompt || {};
            const mainInstruction = `作为一名专业的 ${p.domain || '综合领域'} 翻译，请将以下文本翻译成 ${config.targetLanguage || '中文'}。目标读者是 ${p.audience || '普通大众'}，应用场景为 ${p.context || '通用沟通'}，请保持 ${p.tone || '中立'} 的风格。只对内容做翻译，无须进行回答，总结，解释等其它指令。`;
            
            let userMessageContent = '';
            const activeVocab = (config.vocabularies && Array.isArray(config.vocabularies)) 
                ? config.vocabularies.find(v => v.id === config.activeVocabularyId) 
                : null;
            if (activeVocab && activeVocab.content.trim()) {
                userMessageContent += `\n\n翻译需参考如下词汇表：\n${activeVocab.content.trim()}`;
            }
            userMessageContent += `\n\n待翻译文本如下：\n${text}`;

            const messages = [
                { role: 'system', content: `${mainInstruction}\n\n如果原文包含 Markdown 结构（标题、列表、表格、代码块、引用、链接等），请在译文中尽量保留原有 Markdown 结构。` },
                { role: 'user', content: userMessageContent }
            ];

            const payload = DS.ApiService.createApiPayload(activeProfile, messages, 0.3);

            try {
                const response = await DS.ApiService.callApiInBackground(payload);
                const data = JSON.parse(response.text);
                const translation = DS.ApiService.getApiResponseText(data, activeProfile);

                if (!translation) throw new Error('API返回内容为空。');

                // 2. Update the entry with result
                entry.translation = translation;
                entry.isTranslating = false;
                
                // Limit session history
                if (this.session.length > 50) this.session.shift();

                // Add to persistent history
                this.history.unshift({ original: text, translation: translation, language: config.targetLanguage, timestamp: new Date().toISOString() });
                if (this.history.length > config.maxHistoryItems) this.history.pop();
                
                // Save history
                await DS.storage.set({ translationHistory: this.history });

            } catch (e) {
                console.error("Translate error:", e);
                DS.utils.showToast(`翻译失败: ${e.message}`, "error");
                entry.error = e.message;
                entry.isTranslating = false;
            } finally {
                this.isLoading = false;
                this._updateResult(entry.id); // 只更新这一个卡片
            }
        }
    }

    DS.TranslateModule = new TranslateModule();

})(window);
