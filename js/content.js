// content.js (V5 - Fixed injection and styles)

(function() {
    'use strict';

    const DEBUG = false;
    const debugLog = (...args) => {
        if (DEBUG) console.log(...args);
    };

    debugLog('DSider: Content script initialized');

    // ================= 样式注入 (类似 GM_addStyle) =================
    // 使用 MutationObserver 确保样式在任何页面都能生效
    function injectStylesWhenReady() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .dsider-translate-btn {
                position: fixed !important;
                z-index: 2147483647 !important;
                background-color: #ffffff !important;
                color: #7563ff !important;
                border: 1px solid #7563ff !important;
                border-radius: 8px !important;
                padding: 6px 12px !important;
                cursor: pointer !important;
                font-size: 14px !important;
                font-weight: 600 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                box-shadow: 0 4px 12px rgba(117, 99, 255, 0.25) !important;
                transition: all 0.2s ease !important;
                line-height: 1.4 !important;
                display: none; /* 默认隐藏 */
                align-items: center !important;
                gap: 6px !important;
                white-space: nowrap !important;
                pointer-events: auto !important;
            }
            .dsider-translate-btn:hover {
                background-color: #ffffff !important;
                color: #7563ff !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 6px 16px rgba(117, 99, 255, 0.35) !important;
            }
            .dsider-translate-btn svg {
                width: 16px !important;
                height: 16px !important;
                display: block !important;
                flex-shrink: 0 !important;
            }
            .dsider-translate-btn span {
                flex-shrink: 0 !important;
            }

            .dsider-result-box {
                display: block !important;
                margin-top: 2px !important;
                margin-bottom: 2px !important;
                padding: 8px !important;
                padding-left: 12px !important;
                background-color: transparent !important;
                border: none !important;
                border-left: 3px solid #7563ff !important;
                color: #333 !important;
                font-size: 14px !important;
                line-height: 1.6 !important;
                border-radius: 0 !important;
                position: relative !important;
                z-index: 2147483646 !important;
                box-shadow: none !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                min-width: 200px !important;
                text-align: left !important;
            }

            .dsider-loading {
                color: #666 !important;
                font-style: italic !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
            }
            
            .dsider-loading::before {
                content: "" !important;
                width: 16px !important;
                height: 16px !important;
                border: 2px solid #e9e7ff !important;
                border-top-color: #7563ff !important;
                border-radius: 50% !important;
                animation: dsider-spin 1s linear infinite !important;
            }

            @keyframes dsider-spin {
                to { transform: rotate(360deg); }
            }

            .dsider-copy-btn {
                background-color: #f0f0f5 !important;
                color: #333 !important;
                border: 1px solid #d9d9e3 !important;
                border-radius: 4px !important;
                padding: 4px 10px !important;
                cursor: pointer !important;
                font-size: 12px !important;
                margin-right: 8px !important;
                transition: all 0.2s !important;
                display: inline-block !important;
            }

            .dsider-copy-btn:hover {
                background-color: #e5e5ea !important;
                border-color: #7563ff !important;
                color: #7563ff !important;
            }

            .dsider-close-btn {
                background-color: transparent !important;
                color: #999 !important;
                border: none !important;
                padding: 4px 8px !important;
                cursor: pointer !important;
                font-size: 12px !important;
                float: right !important;
            }
            
            .dsider-close-btn:hover {
                color: #d93025 !important;
            }
            
            .dsider-result-title {
                font-weight: 600 !important;
                color: #7563ff !important;
                margin-bottom: 8px !important;
                display: block !important;
                font-size: 13px !important;
            }
            
            .dsider-result-content {
                color: #333 !important;
                white-space: normal !important;
            }

            .dsider-result-content p {
                margin: 0 0 0.5em !important;
            }

            .dsider-result-content ul,
            .dsider-result-content ol {
                margin: 0 0 0.5em !important;
                padding-left: 20px !important;
            }

            .dsider-result-content code {
                background: rgba(0,0,0,0.05) !important;
                padding: 2px 4px !important;
                border-radius: 3px !important;
                font-family: monospace !important;
            }

            .dsider-result-content pre {
                overflow-x: auto !important;
                background: rgba(0,0,0,0.05) !important;
                padding: 8px !important;
                border-radius: 4px !important;
            }

            .dsider-result-content table {
                border-collapse: collapse !important;
                max-width: 100% !important;
                display: block !important;
                overflow-x: auto !important;
            }

            .dsider-result-content th,
            .dsider-result-content td {
                border: 1px solid #ddd !important;
                padding: 4px 6px !important;
            }
        `;

        function tryInject(target) {
            if (!target) {
                console.error('DSider: Target element is null');
                return false;
            }
            try {
                target.appendChild(styleElement);
                debugLog('DSider: Styles injected successfully');
                return true;
            } catch (e) {
                console.error('DSider: Failed to inject styles:', e);
                return false;
            }
        }

        const target = document.head || document.documentElement;
        if (target) {
            if (tryInject(target)) {
                return;
            }
        }

        debugLog('DSider: DOM not ready, using MutationObserver');

        const observer = new MutationObserver((mutations, obs) => {
            const target = document.head || document.documentElement;
            if (target && !styleElement.parentNode) {
                if (tryInject(target)) {
                    obs.disconnect();
                }
            }
        });

        observer.observe(document, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            if (!styleElement.parentNode) {
                const target = document.head || document.documentElement || document.body;
                if (target && tryInject(target)) {
                    // Success with fallback
                } else {
                    console.warn('DSider: Timeout waiting for DOM to inject styles. Page might be incomplete or XML.');
                }
            }
        }, 10000);
    }

    injectStylesWhenReady();


    // ================= 核心逻辑 =================
    
    // 用于记录在鼠标按下时，Alt键是否被按下
    let altPressedOnMouseDown = false;

    // 存储当前选中的文本和范围
    let selectedText = '';
    let lastRange = null;
    let currentResultDiv = null;

    // 翻译按钮
    let translateButton = null;
    let enableFloatingTranslateButton = false;

    async function loadFloatingTranslateButtonSetting() {
        try {
            const result = await chrome.storage.local.get('enableFloatingTranslateButton');
            enableFloatingTranslateButton = !!result.enableFloatingTranslateButton;
            if (!enableFloatingTranslateButton) hideButton();
        } catch (e) {
            enableFloatingTranslateButton = false;
        }
    }

    loadFloatingTranslateButtonSetting();

    // Listen for settings changes to apply immediately
    try {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== 'local' || !changes) return;
            if (changes.enableFloatingTranslateButton) {
                enableFloatingTranslateButton = !!changes.enableFloatingTranslateButton.newValue;
                if (!enableFloatingTranslateButton) hideButton();
            }
        });
    } catch (e) {
        // Ignore if storage events are unavailable
    }

    async function shouldHideForCurrentDomain() {
        try {
            const result = await chrome.storage.local.get('hideTranslateBtnDomains');
            const hideDomainsList = result.hideTranslateBtnDomains
                ? result.hideTranslateBtnDomains.split(/[,\n]/).map(d => d.trim().toLowerCase()).filter(Boolean)
                : [];
            const currentHostname = window.location.hostname.toLowerCase();
            return hideDomainsList.some(domain => currentHostname.includes(domain));
        } catch (err) {
            if (err.message && err.message.includes('Extension context invalidated')) {
                console.warn('DSider: Extension context invalidated, please refresh the page');
                return false;
            }
            console.warn('DSider: Failed to check hide domains:', err);
            return false;
        }
    }

    function getSafeButtonPosition(anchor, mode = 'point') {
        const buttonWidth = 100;
        const buttonHeight = 34;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        let x;
        let y;
        if (mode === 'selection') {
            x = anchor.right + 10;
            y = anchor.top + (anchor.height - buttonHeight) / 2;
            if (x + buttonWidth > viewportWidth) x = anchor.left - buttonWidth - 10;
        } else {
            x = anchor.x + 10;
            y = anchor.y - buttonHeight / 2;
            if (x + buttonWidth > viewportWidth) x = anchor.x - buttonWidth - 10;
        }

        x = Math.max(10, Math.min(x, viewportWidth - buttonWidth - 10));
        y = Math.max(10, Math.min(y, viewportHeight - buttonHeight - 10));
        return { x, y };
    }

    function createCloseButton() {
        const closeBtn = document.createElement('div');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '2px';
        closeBtn.style.right = '6px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.color = '#999';
        closeBtn.style.fontSize = '16px';
        closeBtn.style.fontWeight = 'bold';
        closeBtn.style.zIndex = '10';
        closeBtn.style.lineHeight = '1';
        closeBtn.title = '关闭';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            if (currentResultDiv) {
                currentResultDiv.remove();
                currentResultDiv = null;
            }
        };
        closeBtn.onmouseenter = () => closeBtn.style.color = '#d93025';
        closeBtn.onmouseleave = () => closeBtn.style.color = '#999';
        return closeBtn;
    }

    function resetResultBox(className = '') {
        if (!currentResultDiv) return;
        currentResultDiv.className = `dsider-result-box ${className}`.trim();
        currentResultDiv.innerHTML = '';
        currentResultDiv.appendChild(createCloseButton());
    }

    function sendInlineTranslationRequest() {
        chrome.runtime.sendMessage({
            type: 'TRANSLATE_SELECTION_INLINE',
            text: selectedText
        });
    }

    function renderInlineMarkdown(text, element) {
        const safeText = escapeHtml(text || '');
        if (window.marked) {
            element.innerHTML = window.marked.parse(safeText, { breaks: true });
        } else {
            element.innerHTML = formatResult(text);
        }
    }

    /**
     * 当用户按下鼠标时，记录 Alt 键的状态。
     */
    document.addEventListener('mousedown', (event) => {
        if (event.altKey) {
            altPressedOnMouseDown = true;
        }

        // 如果点击的是按钮本身或结果框，不做处理
        try {
            if (event.target && event.target.closest && 
                (event.target.closest('.dsider-translate-btn') || event.target.closest('.dsider-result-box'))) {
                return;
            }
        } catch (e) {
            // Ignore if closest is not available
        }

        // 移除可能存在的翻译按钮（但在按住 Alt 时不移除）
        if (!event.altKey) {
            hideButton();
        }
        
        // 注意：不再点击外部关闭翻译结果，用户需要点击关闭按钮
    }, true); 

    /**
     * 当用户释放鼠标时，处理选区
     */
    document.addEventListener('mouseup', function(e) {
        // 保存鼠标位置
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // 如果点击的是按钮本身或结果框，不做处理
        try {
            if (e.target && e.target.closest && 
                (e.target.closest('.dsider-translate-btn') || e.target.closest('.dsider-result-box'))) {
                return;
            }
        } catch (err) {
            // Ignore if closest is not available
        }

        const selection = window.getSelection();
        const text = selection.toString().trim();

        // 如果按住Alt键且选择了文本，触发侧边栏翻译
        // 检查鼠标释放时的Alt键状态，而不是鼠标按下时的状态
        if (e.altKey && text) {
            chrome.runtime.sendMessage({
                type: 'TRANSLATE_SELECTION',
                text: text
            });
            altPressedOnMouseDown = false;
            return;
        }

        // 延迟处理，确保选区稳定
        setTimeout(() => {
            // 重新获取选区，因为某些网页可能会在mouseup后立即清除选区
            const currentSelection = window.getSelection();
            
            // 安全检查：确保有选区范围
            if (currentSelection.rangeCount > 0) {
                const currentText = currentSelection.toString().trim();
                
                if (currentText.length > 0) {
                    selectedText = currentText;
                    try {
                        lastRange = currentSelection.getRangeAt(0).cloneRange(); // 保存选区位置
                        
                        // 使用鼠标位置显示按钮（在鼠标位置右侧）
                        if (enableFloatingTranslateButton) {
                            checkAndShowButtonAtPosition(mouseX, mouseY);
                        } else {
                            hideButton();
                        }
                    } catch (err) {
                        console.warn('DSider: Failed to clone range:', err);
                    }
                } else {
                    hideButton();
                }
            } else {
                hideButton();
            }
        }, 10);

        // 重置Alt键标志位
        altPressedOnMouseDown = false;
    }, true);

    /**
     * 显示翻译按钮
     */
    function showButton(x, y) {
        if (!translateButton) {
            translateButton = document.createElement('button');
            translateButton.className = 'dsider-translate-btn';
            
            // 使用 SVG 图标 + 文本
            const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 5h7" /><path d="M9 3v2c0 4.418 -2.239 8 -5 8" /><path d="M5 9c0 2.144 2.952 3.908 6.7 4" /><path d="M12 20l4 -9l4 9" /><path d="M19.1 18h-6.2" /></svg>`;
            translateButton.innerHTML = `${iconSvg}<span>AI 翻译</span>`;
            
            translateButton.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止触发页面的点击事件
                if (hideButtonTimeout) clearTimeout(hideButtonTimeout); // 清除自动隐藏定时器
                startTranslation();
            });

            // 鼠标移入时取消自动隐藏
            translateButton.addEventListener('mouseenter', () => {
                if (hideButtonTimeout) clearTimeout(hideButtonTimeout);
            });

            // 鼠标移出时重新开始计时
            translateButton.addEventListener('mouseleave', () => {
                startHideTimer();
            });

            document.body.appendChild(translateButton);
        }
        
        translateButton.style.display = 'flex'; // 使用 flex 布局
        translateButton.style.left = `${x}px`;
        translateButton.style.top = `${y}px`;
        
        debugLog('DSider: Button shown at', x, y);

        // 启动3秒自动隐藏
        startHideTimer();
    }

    /**
     * 检查域名并显示翻译按钮
     */
    async function checkAndShowButton(rect) {
        if (!enableFloatingTranslateButton) return;
        if (await shouldHideForCurrentDomain()) {
            debugLog('DSider: Domain in hide list, not showing button');
            return;
        }

        const { x, y } = getSafeButtonPosition(rect, 'selection');
        debugLog('DSider: Selection button position:', { x, y });
        showButton(x, y);
    }

    /**
     * 检查域名并在指定位置显示翻译按钮
     * @param {number} mouseX - 鼠标X坐标（视口坐标）
     * @param {number} mouseY - 鼠标Y坐标（视口坐标）
     */
    async function checkAndShowButtonAtPosition(mouseX, mouseY) {
        if (!enableFloatingTranslateButton) return;
        if (await shouldHideForCurrentDomain()) {
            debugLog('DSider: Domain in hide list, not showing button');
            return;
        }

        const { x, y } = getSafeButtonPosition({ x: mouseX, y: mouseY }, 'point');
        debugLog('DSider: Mouse button position:', { x, y });
        showButton(x, y);
    }

    let hideButtonTimeout = null;

    function startHideTimer() {
        if (hideButtonTimeout) clearTimeout(hideButtonTimeout);
        hideButtonTimeout = setTimeout(() => {
            hideButton();
        }, 2000);
    }

    /**
     * 隐藏翻译按钮
     */
    function hideButton() {
        if (hideButtonTimeout) {
            clearTimeout(hideButtonTimeout);
            hideButtonTimeout = null;
        }
        if (translateButton) translateButton.style.display = 'none';
    }

    /**
     * 开始翻译流程
     */
    function startTranslation() {
        hideButton();
        if (!lastRange) return;

        debugLog('DSider: Starting translation for:', selectedText);

        // 创建结果容器
        currentResultDiv = document.createElement('div');
        currentResultDiv.className = 'dsider-result-box dsider-loading';
        currentResultDiv.innerText = 'AI 正在思考中...';
        currentResultDiv.appendChild(createCloseButton());

        // 插入到选区末尾
        try {
            // 将选区折叠到末尾
            lastRange.collapse(false); 
            lastRange.insertNode(currentResultDiv);

            // 发送翻译请求给background.js
            try {
                sendInlineTranslationRequest();
            } catch (err) {
                if (err.message.includes('Extension context invalidated')) {
                    console.error('DSider: Extension context invalidated. Please refresh the page.');
                    if (currentResultDiv) {
                        resetResultBox();
                        const errorDiv = document.createElement('div');
                        errorDiv.style.color = '#d93025';
                        errorDiv.style.padding = '10px';
                        errorDiv.textContent = '插件已更新，请刷新页面后重试。';
                        currentResultDiv.appendChild(errorDiv);
                    }
                    return;
                }
                throw err; // Re-throw other errors
            }
        } catch (e) {
            console.error("DSider: 插入节点失败", e);
            // 降级方案：如果insertNode失败（例如在input中），使用绝对定位显示
            showFloatingResult(currentResultDiv);
        }
    }
    
    /**
     * 降级方案：显示悬浮结果框
     */
    function showFloatingResult(element) {
        const rect = lastRange.getBoundingClientRect();
        element.style.position = 'absolute';
        element.style.left = `${rect.left + window.scrollX}px`;
        element.style.top = `${rect.bottom + window.scrollY + 10}px`;
        document.body.appendChild(element);
        
        // 发送翻译请求
        sendInlineTranslationRequest();
    }

    /**
     * 简单的 Markdown 格式化 (加粗、斜体、代码)
     */
    function formatResult(text) {
        if (!text) return '';
        // 先转义 HTML 防止 XSS
        let html = escapeHtml(text);
        
        // 处理加粗 **text**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // 处理斜体 *text*
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // 处理代码 `text`
        html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.05);padding:2px 4px;border-radius:3px;font-family:monospace;">$1</code>');
        
        return html;
    }

    /**
     * 转义HTML特殊字符
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 监听来自background.js的消息
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'TRANSLATE_RESULT') {
            debugLog('DSider: Received translation result');
            
            if (currentResultDiv) {
                currentResultDiv.classList.remove('dsider-loading');
                resetResultBox();

                // 译文内容
                const contentDiv = document.createElement('div');
                contentDiv.className = 'dsider-result-content';
                contentDiv.style.paddingRight = '12px'; // 防止遮挡关闭按钮
                renderInlineMarkdown(request.translatedText, contentDiv);
                currentResultDiv.appendChild(contentDiv);
            }
        }

        if (request.type === 'TRANSLATE_ERROR') {
            if (currentResultDiv) {
                currentResultDiv.classList.remove('dsider-loading');
                resetResultBox();

                const title = document.createElement('div');
                title.style.color = '#d93025';
                title.style.fontWeight = 'bold';
                title.style.marginBottom = '4px';
                title.textContent = '翻译失败';

                const message = document.createElement('div');
                message.style.fontSize = '13px';
                message.style.color = '#666';
                message.textContent = request.error || '未知错误';

                currentResultDiv.appendChild(title);
                currentResultDiv.appendChild(message);
            }
        }
    });

})();
