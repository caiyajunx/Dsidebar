// js/utils.js
(function(window) {
    'use strict';

    window.DS = window.DS || {};
    
    // Ensure dependencies
    if (!DS.ICONS) {
        console.error('DS.ICONS not found. Ensure constants.js is loaded first.');
    }

    // --- Chrome Storage Wrappers ---
    DS.storage = {
        get: (keys) => chrome.storage.local.get(keys),
        set: (items) => chrome.storage.local.set(items)
    };

    // --- Helpers ---
    DS.utils = {
        escapeHtml: function(text) {
            if(typeof text !== 'string') return '';
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },

        showToast: function(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `${DS.SCRIPT_PREFIX}-toast ${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                toast.addEventListener('transitionend', () => toast.remove());
            }, 3000);
        },

        confirm: function(message, options = {}) {
            return new Promise(resolve => {
                document.querySelectorAll(`.${DS.SCRIPT_PREFIX}-confirm-popover`).forEach(el => el.remove());

                const popover = document.createElement('div');
                popover.className = `${DS.SCRIPT_PREFIX}-confirm-popover`;

                const text = document.createElement('div');
                text.className = `${DS.SCRIPT_PREFIX}-confirm-message`;
                text.textContent = message || '请确认此操作。';

                const actions = document.createElement('div');
                actions.className = `${DS.SCRIPT_PREFIX}-confirm-actions`;

                const cancelBtn = document.createElement('button');
                cancelBtn.type = 'button';
                cancelBtn.className = `${DS.SCRIPT_PREFIX}-confirm-button secondary`;
                cancelBtn.textContent = options.cancelText || '取消';

                const confirmBtn = document.createElement('button');
                confirmBtn.type = 'button';
                confirmBtn.className = `${DS.SCRIPT_PREFIX}-confirm-button primary`;
                confirmBtn.textContent = options.confirmText || '确认';

                const cleanup = (value) => {
                    document.removeEventListener('keydown', onKeydown, true);
                    popover.classList.remove('show');
                    setTimeout(() => popover.remove(), 160);
                    resolve(value);
                };

                const onKeydown = (event) => {
                    if (event.key === 'Escape') cleanup(false);
                    if (event.key === 'Enter') cleanup(true);
                };

                cancelBtn.addEventListener('click', () => cleanup(false));
                confirmBtn.addEventListener('click', () => cleanup(true));

                actions.appendChild(cancelBtn);
                actions.appendChild(confirmBtn);
                popover.appendChild(text);
                popover.appendChild(actions);
                document.body.appendChild(popover);

                document.addEventListener('keydown', onKeydown, true);
                setTimeout(() => {
                    popover.classList.add('show');
                    confirmBtn.focus();
                }, 10);
            });
        },

        renderMarkdown: function(text, element) {
            element.innerHTML = "";
            // 支持 <think> 和 <thinking> 两种标签
            const thinkRegex = /\<(think|thinking)\>([\s\S]*?)<\/(think|thinking)>/gi;
            const thoughts = [];
            let resultText = text.replace(thinkRegex, (match, openTag, thought, closeTag) => {
                thoughts.push(thought.trim());
                return "";
            }).trim();

            thoughts.forEach(thought => {
                const details = document.createElement("details");
                details.className = `${DS.SCRIPT_PREFIX}-think-block`;
                details.open = false; // 默认折叠
                const summary = document.createElement("summary");
                summary.className = `${DS.SCRIPT_PREFIX}-think-summary`;
                // 使用 🧠 emoji 作为大脑图标
                summary.innerHTML = `<span class="${DS.SCRIPT_PREFIX}-think-icon">🧠</span> 思考过程`;
                const pre = document.createElement("pre");
                pre.className = `${DS.SCRIPT_PREFIX}-think-content`;
                pre.textContent = thought;
                details.appendChild(summary);
                details.appendChild(pre);
                element.appendChild(details);
            });

            if (resultText) {
                const resultDiv = document.createElement("div");
                if (thoughts.length > 0) {
                    resultDiv.className = `${DS.SCRIPT_PREFIX}-result-content`;
                }
                if (window.marked) {
                    resultDiv.innerHTML = window.marked.parse(resultText, { breaks: true });
                } else {
                    resultDiv.textContent = resultText;
                }
                element.appendChild(resultDiv);
            }
        },
        
        extractAndParseJSON: function(text) {
            if (!text) return null;
            let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            const firstOpenBrace = cleanText.indexOf('{');
            const firstOpenBracket = cleanText.indexOf('[');
            let startIndex = -1;
            let endIndex = -1;
    
            if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
                startIndex = firstOpenBrace;
                endIndex = cleanText.lastIndexOf('}');
            } else if (firstOpenBracket !== -1) {
                startIndex = firstOpenBracket;
                endIndex = cleanText.lastIndexOf(']');
            }
    
            if (startIndex !== -1 && endIndex !== -1) {
                cleanText = cleanText.substring(startIndex, endIndex + 1);
            }
            try {
                return JSON.parse(cleanText);
            } catch (error) {
                try {
                    const fixedText = cleanText.replace(/'/g, '"');
                    return JSON.parse(fixedText);
                } catch (e2) {
                    throw new Error("AI 返回的格式无法解析为有效 JSON。");
                }
            }
        },

        showLoadingIndicator: function(text, container) {
            this.hideLoadingIndicator();
            const loader = document.createElement("div");
            loader.className = `${DS.SCRIPT_PREFIX}-loader ${DS.SCRIPT_PREFIX}-loading-indicator`;
            loader.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div><span>${text}</span>`;
            if(container) {
                container.appendChild(loader);
                container.scrollTop = container.scrollHeight;
            }
            return loader; 
        },

        hideLoadingIndicator: function(loaderElement) {
            if (loaderElement && loaderElement.parentNode) {
                loaderElement.parentNode.removeChild(loaderElement);
            } else {
                // Try to find any loader in DOM (fallback)
                const loader = document.querySelector(`.${DS.SCRIPT_PREFIX}-loader`);
                if(loader) loader.remove();
            }
        }
    };

})(window);
