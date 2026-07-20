// sidebar.js (V15 - Fully Modularized)
(function() {
    'use strict';

    // --- References ---
    const DS = window.DS;
    const { ICONS, SCRIPT_PREFIX } = DS;
    const { TranslateModule, ChatModule, SearchModule, SettingsModule, PromptsModule, utils, storage } = DS;

    const STATIC_MODES = [
        { id: 'translate', text: '翻译', icon: ICONS.TRANSLATE },
        { id: 'chat', text: '聊天', icon: ICONS.CHAT },
        { id: 'search', text: '搜索', icon: ICONS.SEARCH },
        { id: 'bohrium', text: '玻尔', icon: ICONS.BOHRIUM },
        { id: 'ima', text: 'IMA', icon: ICONS.IMA },
        { id: 'wenda', text: '问答', icon: ICONS.WENDA },
        { id: 'aily', text: 'Aily', icon: ICONS.AILY },
        { id: 'doubao', text: '豆包', icon: ICONS.DOUBAO },
        { id: 'kimi', text: 'KIMI', icon: ICONS.KIMI },
        { id: 'prompts', text: '咒语', icon: ICONS.PROMPTS },
        { id: 'history', text: '历史', icon: ICONS.HISTORY },
        { id: 'settings', text: '设置', icon: ICONS.SETTINGS }
    ];
    

    // --- State ---
    let config = {};
    let currentMode = 'translate';
    DS.currentMode = currentMode;
    
    // 懒加载标记：记录哪些模块已经渲染过
    const renderedModules = new Set();

    // --- DOM Elements ---
    let mainContentPanel, historyPanel, promptsPanel, settingsPanel;
    let mainChatInput, mainSendButton;
    let quickLangSelect, quickModelSelect;
    let translationHistoryListDiv, chatHistoryListDiv, searchHistoryListDiv;

    // --- Init ---
    // 验证 mode 是否有效且可见
    function isModeValid(modeId) {
        const fullModes = getFullModes();
        const visibleModes = fullModes.filter(mode => {
            if (mode.isCustom) return true;
            if (config.menuVisibility && config.menuVisibility.hasOwnProperty(mode.id)) {
                return config.menuVisibility[mode.id];
            }
            return true;
        });
        return visibleModes.some(m => m.id === modeId);
    }

    async function initialize() {
        // Load Config
        let storedData = await storage.get({
            schemaVersion: null,
            apiProfiles: null,
            activeTranslateProfileId: null, activeChatProfileId: null, activeSearchProfileId: null,
            vocabularies: null, activeVocabularyId: null,
            translationPrompt: null,
            targetLanguage: null, maxHistoryItems: null,
            translationHistory: [], chatHistory: [], searchHistory: [],
            uiMode: null, searchSettings: null, menuVisibility: null, customTools: null,
            hideTranslateBtnDomains: null,
            enableFloatingTranslateButton: null,
            setupCompleted: false,
            lastMode: null
        });

        // Use default config if apiProfiles is null (first-time setup)
        if (storedData.apiProfiles === null) {
            const defaults = DS.DEFAULT_CONFIG || {};
            
            // Copy default values with user-specific IDs
            storedData.apiProfiles = defaults.apiProfiles || [];
            
            // Set active profile IDs
            if (storedData.apiProfiles.length > 0) {
                storedData.activeTranslateProfileId = storedData.apiProfiles[0].id;
                storedData.activeChatProfileId = storedData.apiProfiles[0].id;
                storedData.activeSearchProfileId = storedData.apiProfiles[0].id;
            }
            
            // Use defaults for other settings
            storedData.translationPrompt = defaults.translationPrompt || {};
            storedData.targetLanguage = defaults.targetLanguage || '中文';
            storedData.maxHistoryItems = defaults.maxHistoryItems || 50;
            storedData.vocabularies = defaults.vocabularies || [];
            storedData.searchSettings = defaults.searchSettings || { tavilyKeys: [''], searchRole: '', customSearchProfiles: [] };
            storedData.customTools = defaults.customTools || [];
            storedData.menuVisibility = defaults.menuVisibility || {};
            storedData.uiMode = defaults.uiMode || 'rail';
            storedData.hideTranslateBtnDomains = defaults.hideTranslateBtnDomains || '';
            storedData.enableFloatingTranslateButton = !!defaults.enableFloatingTranslateButton;
            
            // Save initial config
            await storage.set({
                schemaVersion: defaults.schemaVersion || '2.0',
                apiProfiles: storedData.apiProfiles,
                activeTranslateProfileId: storedData.activeTranslateProfileId,
                activeChatProfileId: storedData.activeChatProfileId,
                activeSearchProfileId: storedData.activeSearchProfileId,
                translationPrompt: storedData.translationPrompt,
                targetLanguage: storedData.targetLanguage,
                maxHistoryItems: storedData.maxHistoryItems,
                vocabularies: storedData.vocabularies,
                searchSettings: storedData.searchSettings,
                customTools: storedData.customTools,
                menuVisibility: storedData.menuVisibility,
                uiMode: storedData.uiMode,
                hideTranslateBtnDomains: storedData.hideTranslateBtnDomains,
                enableFloatingTranslateButton: storedData.enableFloatingTranslateButton,
                setupCompleted: false,
                lastMode: 'translate'
            });
        }
        
        // Ensure searchSettings for existing users (migration)
        const defaultSearchSettings = (DS.DEFAULT_CONFIG && DS.DEFAULT_CONFIG.searchSettings) || {};
        storedData.searchSettings = {
            ...defaultSearchSettings,
            ...(storedData.searchSettings || {})
        };
        if (!Array.isArray(storedData.searchSettings.tavilyKeys)) {
            storedData.searchSettings.tavilyKeys = defaultSearchSettings.tavilyKeys || [''];
        }
        if (!Array.isArray(storedData.searchSettings.customSearchProfiles)) {
            storedData.searchSettings.customSearchProfiles = defaultSearchSettings.customSearchProfiles || [];
        }
        const defaultDataSources = defaultSearchSettings.dataSources || {};
        storedData.searchSettings.dataSources = {
            ...defaultDataSources,
            ...(storedData.searchSettings.dataSources || {}),
            openFda: {
                ...(defaultDataSources.openFda || {}),
                ...(storedData.searchSettings.dataSources?.openFda || {})
            },
            clinicalTrials: {
                ...(defaultDataSources.clinicalTrials || {}),
                ...(storedData.searchSettings.dataSources?.clinicalTrials || {})
            }
        };
        storedData.schemaVersion = DS.DEFAULT_CONFIG?.schemaVersion || storedData.schemaVersion || '2.0';
        await storage.set({ searchSettings: storedData.searchSettings });

        // Ensure menuVisibility for existing users (migration)
        if (!storedData.menuVisibility || typeof storedData.menuVisibility !== 'object') {
            const defaults = DS.DEFAULT_CONFIG || {};
            storedData.menuVisibility = defaults.menuVisibility || { bohrium: true, aily: true, ima: true, wenda: true, kimi: true, doubao: true, prompts: true };
            
            // Migration: add new visibility keys for existing users
            ['bohrium', 'aily'].forEach(key => {
                if (!storedData.menuVisibility.hasOwnProperty(key)) {
                    storedData.menuVisibility[key] = true;
                }
            });
            
            await storage.set({ menuVisibility: storedData.menuVisibility });
        }

        // Ensure enableFloatingTranslateButton for existing users (migration)
        if (typeof storedData.enableFloatingTranslateButton !== 'boolean') {
            storedData.enableFloatingTranslateButton = false;
            await storage.set({ enableFloatingTranslateButton: storedData.enableFloatingTranslateButton });
        }

        config = storedData;
        DS.config = config;

        // Init Modules
        TranslateModule.init(config.translationHistory);
        ChatModule.init(config.chatHistory);
        SearchModule.init(config.searchHistory);
        PromptsModule.init(config);
        SettingsModule.init({
            onProfileChange: () => populateQuickSelectors(),
            onNavUpdate: () => renderNavMenus(),
            onSwitchMode: (mode) => switchMode(mode)
        });

        createUI();
        
        // 移除初始全量渲染，改为按需渲染（懒加载优化）

        setUIMode(config.uiMode, true);
        
        // 恢复上次打开的菜单，无效则默认翻译
        const lastMode = storedData.lastMode;
        const initialMode = (lastMode && isModeValid(lastMode)) ? lastMode : 'translate';
        switchMode(initialMode, true);
        
        processPendingTranslation();
    }

    async function processPendingTranslation() {
        try {
            const result = await chrome.storage.session.get('pendingTranslation');
            if (result.pendingTranslation) {
                const text = result.pendingTranslation;
                await chrome.storage.session.remove('pendingTranslation');
                switchMode('translate');
                // Don't fill input, just translate
                if (mainChatInput) mainChatInput.value = ''; 
                TranslateModule.translateText(text, config);
            }
        } catch (error) { console.error(error); }
    }

    // --- UI Creation ---
    function createUI() {
        const floatingMenu = document.getElementById('aiTranslator-floating-menu');
        
        mainContentPanel = createMainInteractionPanel();
        historyPanel = createHistoryPanel();
        promptsPanel = PromptsModule.createPanel();
        // Settings Panel is created on demand or now? Let's create now to be safe
        settingsPanel = SettingsModule.createPanel();
        
        const panelContainer = document.getElementById('aiTranslator-panel-container');
        panelContainer.appendChild(mainContentPanel);
        panelContainer.appendChild(historyPanel);
        panelContainer.appendChild(promptsPanel);
        panelContainer.appendChild(settingsPanel);

        document.getElementById('aiTranslator-collapse-button').addEventListener('click', () => setUIMode('floating'));
        document.getElementById('aiTranslator-expand-button').addEventListener('click', () => setUIMode('rail'));
        const topBarMenuButton = document.getElementById('aiTranslator-top-bar-menu-button');
        topBarMenuButton.addEventListener('click', () => floatingMenu.classList.toggle('visible'));
        
        // Add Refresh Button to Top Bar
        const topBar = document.getElementById('aiTranslator-top-bar');
        const refreshButton = document.createElement('button');
        refreshButton.id = 'aiTranslator-refresh-button';
        refreshButton.className = 'aiTranslator-menu-button';
        refreshButton.title = '刷新当前页面';
        refreshButton.style.display = 'none'; // Default hidden
        refreshButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
        refreshButton.addEventListener('click', () => {
             // Logic to refresh current iframe
             const currentMode = DS.currentMode;
             const iframeId = `${SCRIPT_PREFIX}-iframe-${currentMode}`;
             const iframe = document.getElementById(iframeId);
             if (iframe) {
                 iframe.src = iframe.src;
                 utils.showToast("页面正在刷新...", "success");
             }
        });
        // Insert after menu button
        topBar.insertBefore(refreshButton, topBarMenuButton.nextSibling);

        // 在顶部栏右侧添加划词翻译按钮开关（只在翻译页面显示）
        const floatingToggleBtnInHeader = document.createElement('button');
        floatingToggleBtnInHeader.className = 'aiTranslator-menu-button';
        floatingToggleBtnInHeader.id = 'aiTranslator-floating-toggle-btn';
        floatingToggleBtnInHeader.title = '选中文本后是否显示浮动翻译按钮';
        floatingToggleBtnInHeader.style.display = 'none'; // 默认隐藏

        const updateHeaderToggleBtn = () => {
            const enabled = !!config.enableFloatingTranslateButton;
            floatingToggleBtnInHeader.classList.toggle('active', enabled);
            // 滑动开关不需要 innerHTML，样式由 CSS 控制
        };

        floatingToggleBtnInHeader.addEventListener('click', async () => {
            const next = !config.enableFloatingTranslateButton;
            config.enableFloatingTranslateButton = next;
            await storage.set({ enableFloatingTranslateButton: next });
            updateHeaderToggleBtn();
            utils.showToast(`划词浮动翻译按钮已${next ? '开启' : '关闭'}`, 'success');
        });

        // 插入到顶部栏末尾（最右侧）
        topBar.appendChild(floatingToggleBtnInHeader);

        // 初始状态更新按钮显示
        const checkAndUpdateBtn = () => {
            if (config && typeof config.enableFloatingTranslateButton !== 'undefined') {
                updateHeaderToggleBtn();
            } else {
                setTimeout(checkAndUpdateBtn, 100);
            }
        };
        checkAndUpdateBtn();

        document.addEventListener('click', (e) => {
            if (!floatingMenu.contains(e.target) && !topBarMenuButton.contains(e.target)) {
                floatingMenu.classList.remove('visible');
            }
        });

        renderNavMenus();
    }

    function createMainInteractionPanel() {
        const panel = document.createElement('div');
        panel.className = `${SCRIPT_PREFIX}-main-content-panel`;

        const sessionControls = document.createElement('div');
        sessionControls.className = `${SCRIPT_PREFIX}-session-controls`;
        const clearButton = document.createElement('button');
        clearButton.className = `${SCRIPT_PREFIX}-clear-session-button`;
        clearButton.textContent = '清除当前会话';
        clearButton.addEventListener('click', () => {
            if (currentMode === 'translate') TranslateModule.clearSession();
            else if (currentMode === 'chat') ChatModule.clearSession();
            else if (currentMode === 'search') SearchModule.clearSession();
            updateMainPanelUI();
        });
        sessionControls.appendChild(clearButton);
        
        // Create Separate Output Areas for Translate, Chat, Search
        const translateOutput = document.createElement('div');
        translateOutput.id = `${SCRIPT_PREFIX}-translate-output`;
        translateOutput.className = `${SCRIPT_PREFIX}-output-display-area`;
        translateOutput.style.display = 'none'; // Default hidden

        const chatOutput = document.createElement('div');
        chatOutput.id = `${SCRIPT_PREFIX}-chat-output`;
        chatOutput.className = `${SCRIPT_PREFIX}-output-display-area`;
        chatOutput.style.display = 'none';

        const searchOutput = document.createElement('div');
        searchOutput.id = `${SCRIPT_PREFIX}-search-output`;
        searchOutput.className = `${SCRIPT_PREFIX}-output-display-area`;
        searchOutput.style.display = 'none';
        
        // Inline History Panel
        const inlineHistoryPanel = document.createElement('div');
        inlineHistoryPanel.id = `${SCRIPT_PREFIX}-inline-history-panel`;
        inlineHistoryPanel.className = `${SCRIPT_PREFIX}-inline-history-panel hidden`;
        inlineHistoryPanel.innerHTML = `
            <div class="${SCRIPT_PREFIX}-inline-history-header">
                <span>历史记录</span>
                <button class="${SCRIPT_PREFIX}-inline-history-close">×</button>
            </div>
            <div class="${SCRIPT_PREFIX}-inline-history-content"></div>
        `;
        inlineHistoryPanel.querySelector(`.${SCRIPT_PREFIX}-inline-history-close`).addEventListener('click', () => {
            inlineHistoryPanel.classList.add('hidden');
        });
        panel.appendChild(inlineHistoryPanel);

        panel.appendChild(sessionControls);
        
        // Append all outputs
        panel.appendChild(translateOutput);
        panel.appendChild(chatOutput);
        panel.appendChild(searchOutput);
        
        panel.appendChild(createInputArea());
        return panel;
    }

    function createInputArea() {
        const container = document.createElement('div');
        container.className = `${SCRIPT_PREFIX}-input-container`;
        const inputBox = document.createElement('div');
        inputBox.className = `${SCRIPT_PREFIX}-input-box`;

        const optionsContainer = document.createElement('div');
        optionsContainer.className = `${SCRIPT_PREFIX}-input-options`;

        const langOptionGroup = document.createElement('div');
        langOptionGroup.className = `${SCRIPT_PREFIX}-option-group`;
        langOptionGroup.dataset.option = "language";
        langOptionGroup.innerHTML = `<span>译为:</span>`;
        quickLangSelect = document.createElement('select');
        ['中文', '英文', '日文', '韩文'].forEach(lang => {
            const opt = document.createElement('option');
            opt.value = lang; opt.textContent = lang;
            quickLangSelect.appendChild(opt);
        });
        quickLangSelect.addEventListener('change', async (e) => {
            config.targetLanguage = e.target.value;
            await storage.set({ targetLanguage: config.targetLanguage });
            utils.showToast(`语言已切换为 ${config.targetLanguage}`, 'success');
        });
        langOptionGroup.appendChild(quickLangSelect);

        const modelOptionGroup = document.createElement('div');
        modelOptionGroup.className = `${SCRIPT_PREFIX}-option-group`;
        modelOptionGroup.innerHTML = `<span>模型:</span>`;
        quickModelSelect = document.createElement('select');
        quickModelSelect.addEventListener('change', async (e) => {
            const newId = e.target.value;
            let key;
            if (currentMode === 'translate') key = 'activeTranslateProfileId';
            else if (currentMode === 'chat') key = 'activeChatProfileId';
            else if (currentMode === 'search') key = 'activeSearchProfileId';
            
            if (key) {
                config[key] = newId;
                await storage.set({ [key]: newId });
                const p = config.apiProfiles.find(x => x.id === newId);
                utils.showToast(`模型已切换为 ${p.name}`, 'success');
            }
        });
        modelOptionGroup.appendChild(quickModelSelect);

        optionsContainer.appendChild(langOptionGroup);
        optionsContainer.appendChild(modelOptionGroup);

        const rightActions = document.createElement('div');
        rightActions.style.display = 'flex';
        rightActions.style.alignItems = 'center';
        rightActions.style.gap = '8px';
        rightActions.style.marginLeft = 'auto';

        const historyBtn = document.createElement('button');
        historyBtn.className = `${SCRIPT_PREFIX}-history-toggle-btn`;
        historyBtn.title = '查看历史记录';
        historyBtn.innerHTML = ICONS.HISTORY;
        historyBtn.style.marginLeft = '0';
        historyBtn.addEventListener('click', toggleInlineHistoryPanel);

        rightActions.appendChild(historyBtn);
        optionsContainer.appendChild(rightActions);

        const mainInputArea = document.createElement('div');
        mainInputArea.className = `${SCRIPT_PREFIX}-input-main`;
        mainChatInput = document.createElement('textarea');
        mainChatInput.className = `${SCRIPT_PREFIX}-main-chat-textarea`;
        mainChatInput.rows = 1;
        mainChatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }});
        mainChatInput.addEventListener('input', () => {
            mainChatInput.style.height = 'auto';
            mainChatInput.style.height = `${Math.min(mainChatInput.scrollHeight, 200)}px`;
        });
        
        const footerDiv = document.createElement('div');
        footerDiv.className = `${SCRIPT_PREFIX}-input-footer`;
        mainSendButton = document.createElement('button');
        mainSendButton.className = `${SCRIPT_PREFIX}-send-button`;
        mainSendButton.addEventListener('click', handleSend);
        footerDiv.appendChild(mainSendButton);
        
        mainInputArea.appendChild(mainChatInput);
        mainInputArea.appendChild(footerDiv);
        inputBox.appendChild(optionsContainer);
        inputBox.appendChild(mainInputArea);
        container.appendChild(inputBox);
        return container;
    }

    function handleSend() {
        if (!mainChatInput || !mainSendButton || mainSendButton.disabled) return;

        if (currentMode === 'chat' && ChatModule.isLoading) {
            utils.showToast('正在生成上一条回复，请稍候再发送。', 'error');
            return;
        }

        const text = mainChatInput.value.trim();
        if (!text) return;
        mainChatInput.value = "";
        mainChatInput.style.height = "auto";
        
        if (currentMode === 'translate') TranslateModule.translateText(text, config);
        else if (currentMode === 'chat') ChatModule.sendMessage(text, config);
        else if (currentMode === 'search') SearchModule.executeSearch(text, config);
        mainChatInput.focus();
    }

    // --- Mode Switching ---
    function switchMode(modeId, isInitial = false) {
        if (!isInitial && modeId === currentMode) return;
        currentMode = modeId;
        DS.currentMode = currentMode;

        // 保存当前模式（非初始化时）
        if (!isInitial) {
            storage.set({ lastMode: modeId });
        }

        // Hide all panels
        [mainContentPanel, historyPanel, promptsPanel, settingsPanel].forEach(p => { if(p) p.style.display = 'none'; });
        
        // Hide Iframe Container (don't clear it)
        let iframeContainer = document.getElementById(`${SCRIPT_PREFIX}-iframe-container`);
        if (iframeContainer) iframeContainer.style.display = 'none';

        // Update Nav
        document.querySelectorAll(`.${SCRIPT_PREFIX}-nav-button`).forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === modeId);
        });

        // Restore Mode Status Title
        const fullModes = getFullModes();
        const modeData = fullModes.find(m => m.id === modeId) || {};
        const modeStatus = document.getElementById('aiTranslator-mode-status');
        if (modeStatus) {
            modeStatus.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; font-weight:600; font-size:16px; color:var(--text-primary);">
                    ${modeData.icon || ''}
                    <span>${modeData.text || ''}</span>
                </div>
            `;
        }
        
        // Handle Refresh Button Visibility
        const refreshBtn = document.getElementById('aiTranslator-refresh-button');
        if (refreshBtn) {
            if (['translate', 'chat', 'search', 'history', 'settings', 'prompts'].includes(modeId)) {
                refreshBtn.style.display = 'none';
            } else {
                refreshBtn.style.display = 'flex';
            }
        }

        // Handle Floating Toggle Button Visibility (only show in translate mode)
        const floatingToggleBtn = document.getElementById('aiTranslator-floating-toggle-btn');
        if (floatingToggleBtn) {
            floatingToggleBtn.style.display = modeId === 'translate' ? 'flex' : 'none';
        }

        if (modeId === 'history') {
            historyPanel.style.display = 'flex';
            renderHistoryPanelContent(); // Refresh history list
        } else if (modeId === 'settings') {
            settingsPanel.style.display = 'flex';
        } else if (modeId === 'prompts') {
            promptsPanel.style.display = 'flex';
        } else if (['translate', 'chat', 'search'].includes(modeId)) {
            mainContentPanel.style.display = 'flex';
            
            // 懒加载：首次访问时才渲染
            if (!renderedModules.has(modeId)) {
                if (modeId === 'translate') TranslateModule.render();
                else if (modeId === 'chat') ChatModule.render();
                else if (modeId === 'search') SearchModule.render();
                renderedModules.add(modeId);
            }
            
            // Toggle sub-containers
            const translateOut = document.getElementById(`${SCRIPT_PREFIX}-translate-output`);
            const chatOut = document.getElementById(`${SCRIPT_PREFIX}-chat-output`);
            const searchOut = document.getElementById(`${SCRIPT_PREFIX}-search-output`);
            
            if(translateOut) translateOut.style.display = modeId === 'translate' ? 'block' : 'none';
            if(chatOut) chatOut.style.display = modeId === 'chat' ? 'block' : 'none';
            if(searchOut) searchOut.style.display = modeId === 'search' ? 'block' : 'none';

            updateMainPanelUI();
            
            // Render calls removed to prevent reloading DOM on switch. 
            // DOM state is preserved in the hidden/shown divs.
        } else {
            // Iframe modes
            if (!iframeContainer) {
                iframeContainer = document.createElement('div');
                iframeContainer.id = `${SCRIPT_PREFIX}-iframe-container`;
                iframeContainer.className = `${SCRIPT_PREFIX}-main-content-panel`;
                iframeContainer.style.padding = '0'; // Ensure full size
                document.getElementById('aiTranslator-panel-container').appendChild(iframeContainer);
            }
            iframeContainer.style.display = 'flex';
            
            // Hide all children iframes
            Array.from(iframeContainer.children).forEach(child => child.style.display = 'none');
            
            const fullModes = getFullModes();
            const modeObj = fullModes.find(m => m.id === modeId);
            const iframeId = `${SCRIPT_PREFIX}-iframe-${modeId}`;
            let iframe = document.getElementById(iframeId);
            
            if (!iframe) {
                let url = '';
                if (modeId === 'aily') url = DS.URLS.AILY;
                else if (modeId === 'bohrium') url = DS.URLS.BOHRIUM;
                else if (modeId === 'ima') url = DS.URLS.IMA;
                else if (modeId === 'wenda') url = DS.URLS.WENDA;
                else if (modeId === 'kimi') url = DS.URLS.KIMI;
                else if (modeId === 'doubao') url = DS.URLS.DOUBAO;
                else if (modeObj?.isCustom) url = modeObj.url;

                if (url) {
                    if (modeId === 'ima' || modeObj?.isCustom) {
                        const separator = url.includes('?') ? '&' : '?';
                        url += `${separator}in-dsider-panel=true`;
                    }

                    iframe = document.createElement('iframe');
                    iframe.id = iframeId;
                    iframe.src = url;
                    iframe.style.width = '100%'; 
                    iframe.style.height = '100%'; 
                    iframe.style.border = 'none';
                    iframeContainer.appendChild(iframe);
                }
            }
            
            if (iframe) iframe.style.display = 'block';
        }
        populateQuickSelectors();
    }

    function updateMainPanelUI() {
        if (!mainContentPanel) return;
        const inputContainer = mainContentPanel.querySelector(`.${SCRIPT_PREFIX}-input-container`);
        if(!inputContainer) return;

        const optionsContainer = mainContentPanel.querySelector(`.${SCRIPT_PREFIX}-input-options`);
        const langOption = optionsContainer.querySelector(`.${SCRIPT_PREFIX}-option-group[data-option="language"]`);
        const sessionControls = mainContentPanel.querySelector(`.${SCRIPT_PREFIX}-session-controls`);

        let showInput = ['chat', 'translate'].includes(currentMode);

        inputContainer.style.display = showInput ? 'block' : 'none';
        if (langOption) langOption.style.display = currentMode === 'translate' ? 'flex' : 'none';
        
        let hasSession = false;
        if (currentMode === 'translate') hasSession = TranslateModule.session.length > 0;
        else if (currentMode === 'chat') hasSession = ChatModule.conversation.length > 0;
        else if (currentMode === 'search') hasSession = SearchModule.session.length > 0;
        sessionControls.style.display = hasSession ? 'block' : 'none';

        if (currentMode === 'chat') {
            mainSendButton.textContent = '发送';
            mainChatInput.placeholder = '问任何问题...';
        } else if (currentMode === 'translate') {
            mainSendButton.textContent = '翻译';
            mainChatInput.placeholder = '输入或粘贴文本进行翻译...';
        }
    }

    function populateQuickSelectors() {
        if (quickLangSelect) quickLangSelect.value = config.targetLanguage;
        if (quickModelSelect) {
            quickModelSelect.innerHTML = '';
            if (config.apiProfiles && Array.isArray(config.apiProfiles)) {
                config.apiProfiles.forEach(profile => {
                    const opt = document.createElement('option');
                    opt.value = profile.id;
                    opt.textContent = profile.name;
                    quickModelSelect.appendChild(opt);
                });
                let activeId;
                if (currentMode === 'translate') activeId = config.activeTranslateProfileId;
                else if (currentMode === 'chat') activeId = config.activeChatProfileId;
                else if (currentMode === 'search') activeId = config.activeSearchProfileId;
                
                if (activeId && config.apiProfiles.some(p => p.id === activeId)) {
                     quickModelSelect.value = activeId;
                } else if (config.apiProfiles.length > 0) {
                     quickModelSelect.value = config.apiProfiles[0].id;
                }
            }
        }
    }

    // --- Helpers for Nav/Mode ---
    function setUIMode(mode, isInitial = false) {
        document.getElementById('app-container').classList.toggle('floating-mode', mode === 'floating');
        if (mode !== 'floating') document.getElementById('aiTranslator-floating-menu').classList.remove('visible');
        if (!isInitial) {
            config.uiMode = mode;
            storage.set({ uiMode: mode });
        }
    }

    function getFullModes() {
        const customTools = config.customTools || [];
        const customModes = customTools.map(tool => ({
            id: `custom_${tool.id}`, text: tool.name, icon: ICONS.CUSTOM_TOOL, url: tool.url, isCustom: true
        }));
        const promptsIndex = STATIC_MODES.findIndex(m => m.id === 'prompts');
        return [...STATIC_MODES.slice(0, promptsIndex), ...customModes, ...STATIC_MODES.slice(promptsIndex)];
    }

    function createNavButton(mode) {
        const button = document.createElement('button');
        button.className = `${SCRIPT_PREFIX}-nav-button`;
        button.dataset.mode = mode.id;
        button.title = mode.text;
        button.innerHTML = `${mode.icon}<span class="button-text">${mode.text}</span>`;
        return button;
    }

    function renderNavMenus() {
        const navButtonsContainer = document.getElementById('aiTranslator-nav-buttons-container');
        const floatingMenuGrid = document.getElementById('aiTranslator-floating-menu-grid');
        navButtonsContainer.innerHTML = '';
        floatingMenuGrid.innerHTML = '';
        
        const fullModes = getFullModes();
        const visibleModes = fullModes.filter(mode => {
            if (mode.isCustom) return true;
            if (config.menuVisibility && config.menuVisibility.hasOwnProperty(mode.id)) return config.menuVisibility[mode.id];
            return true;
        });

        visibleModes.forEach(mode => {
            [navButtonsContainer, floatingMenuGrid].forEach(container => {
                const button = createNavButton(mode);
                button.addEventListener('click', () => {
                    switchMode(mode.id);
                    if (container === floatingMenuGrid) {
                         document.getElementById('aiTranslator-floating-menu').classList.remove('visible');
                    }
                });
                container.appendChild(button);
            });
        });
        document.querySelectorAll(`.${SCRIPT_PREFIX}-nav-button`).forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === currentMode);
        });
    }

    // --- Inline History Logic ---
    function toggleInlineHistoryPanel() {
        const panel = document.getElementById(`${SCRIPT_PREFIX}-inline-history-panel`);
        if (!panel) return;
        if (panel.classList.contains('hidden')) {
            updateInlineHistoryContent();
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    }

    function updateInlineHistoryContent() {
        const contentDiv = document.querySelector(`#${SCRIPT_PREFIX}-inline-history-panel .${SCRIPT_PREFIX}-inline-history-content`);
        if (!contentDiv) return;
        contentDiv.innerHTML = '';
        
        let historySource = [];
        if (currentMode === 'translate') historySource = TranslateModule.history;
        else if (currentMode === 'chat') historySource = ChatModule.history;
        else if (currentMode === 'search') historySource = SearchModule.history;
        else {
            contentDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-placeholder-text">当前模式无历史记录</div>`;
            return;
        }

        if (historySource.length === 0) {
            contentDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-placeholder-text">暂无历史记录</div>`;
            return;
        }

        historySource.slice().reverse().forEach(item => {
            const itemDiv = document.createElement("div");
            itemDiv.className = `${SCRIPT_PREFIX}-history-item compact`;
            itemDiv.style.cursor = 'pointer';
            itemDiv.title = "点击恢复此会话";

            if (currentMode === 'translate') {
                const originalDiv = document.createElement('div');
                originalDiv.className = `${SCRIPT_PREFIX}-history-text`;
                originalDiv.style.marginBottom = '6px';
                originalDiv.style.color = 'var(--text-primary)';
                originalDiv.style.fontWeight = '500';
                originalDiv.textContent = item.original;
                const translationDiv = document.createElement('div');
                translationDiv.className = `${SCRIPT_PREFIX}-history-text`;
                translationDiv.style.color = 'var(--text-secondary)';
                translationDiv.textContent = item.translation;
                itemDiv.appendChild(originalDiv);
                itemDiv.appendChild(translationDiv);
            } else {
                let text = '';
                if (currentMode === 'chat') text = item.length > 0 ? item[0].content : "空对话";
                else if (currentMode === 'search') text = item.query;
                itemDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-history-text">${utils.escapeHtml(text.substring(0, 100) + '...')}</div>`;
            }
            
            itemDiv.addEventListener("click", async () => {
                if (!(await utils.confirm("要恢复此会话吗？当前会话将被覆盖。"))) return;
                if (currentMode === 'translate') TranslateModule.restoreSession(item);
                else if (currentMode === 'chat') ChatModule.restoreSession(item);
                else if (currentMode === 'search') SearchModule.restoreSession(item);
                document.getElementById(`${SCRIPT_PREFIX}-inline-history-panel`).classList.add('hidden');
            });
            contentDiv.prepend(itemDiv);
        });
    }

    // --- Main History Panel (Legacy Redone) ---
    function createHistoryPanel() {
        const panel = document.createElement('div');
        panel.className = `${SCRIPT_PREFIX}-history-panel`;
        const header = document.createElement('div');
        header.className = `${SCRIPT_PREFIX}-history-header`;
        header.innerHTML = `<h2 class="${SCRIPT_PREFIX}-history-title">历史记录</h2>`;
        const clearButton = document.createElement('button');
        clearButton.className = `${SCRIPT_PREFIX}-clear-history-button`;
        clearButton.textContent = '清除全部';
        
        clearButton.addEventListener('click', async () => {
            if (!(await utils.confirm("确定要清除所有历史记录吗？"))) return;
            TranslateModule.history = [];
            ChatModule.history = [];
            SearchModule.history = [];
            storage.set({ translationHistory: [], chatHistory: [], searchHistory: [] });
            renderHistoryPanelContent();
            utils.showToast("历史记录已清除");
        });
        
        header.appendChild(clearButton);
        const tabsContainer = document.createElement('div');
        tabsContainer.className = `${SCRIPT_PREFIX}-history-tabs-container`;
        const contentArea = document.createElement('div');
        contentArea.className = `${SCRIPT_PREFIX}-history-content-area`;
        
        translationHistoryListDiv = document.createElement('div');
        chatHistoryListDiv = document.createElement('div');
        searchHistoryListDiv = document.createElement('div');
        
        const tabs = {
            '翻译': {div: translationHistoryListDiv, button: document.createElement('button')},
            '对话': {div: chatHistoryListDiv, button: document.createElement('button')},
            '搜索': {div: searchHistoryListDiv, button: document.createElement('button')}
        };

        let isFirst = true;
        for (const [name, data] of Object.entries(tabs)) {
            data.div.style.display = isFirst ? 'block' : 'none';
            contentArea.appendChild(data.div);

            data.button.className = `${SCRIPT_PREFIX}-history-tab`;
            if (isFirst) data.button.classList.add('active');
            data.button.textContent = name;

            data.button.addEventListener('click', () => {
                Object.values(tabs).forEach(t => {
                    t.button.classList.remove('active');
                    t.div.style.display = 'none';
                });
                data.button.classList.add('active');
                data.div.style.display = 'block';
            });

            tabsContainer.appendChild(data.button);
            isFirst = false;
        }

        panel.appendChild(header);
        panel.appendChild(tabsContainer);
        panel.appendChild(contentArea);
        return panel;
    }

    function renderHistoryPanelContent() {
        if (!translationHistoryListDiv) return;
        
        // Render Translation
        translationHistoryListDiv.innerHTML = "";
        if (TranslateModule.history.length === 0) {
            translationHistoryListDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-placeholder-text">暂无翻译历史</div>`;
        } else {
            TranslateModule.history.slice().reverse().forEach(item => {
                // Reuse logic from inline history but make it block style?
                // Or recreate createTranslationResultBlock logic
                const wrapper = document.createElement('div');
                wrapper.className = `${SCRIPT_PREFIX}-history-item`;
                
                const originalDiv = document.createElement('div');
                originalDiv.className = `${SCRIPT_PREFIX}-history-text`;
                originalDiv.style.marginBottom = '8px';
                originalDiv.style.color = 'var(--text-primary)';
                originalDiv.textContent = item.original;
                
                const translationDiv = document.createElement('div');
                translationDiv.className = `${SCRIPT_PREFIX}-history-text`;
                translationDiv.style.color = 'var(--accent-primary)';
                translationDiv.textContent = item.translation;
                
                wrapper.appendChild(originalDiv);
                wrapper.appendChild(translationDiv);
                translationHistoryListDiv.prepend(wrapper);
            });
        }

        // Render Chat
        chatHistoryListDiv.innerHTML = "";
        if (ChatModule.history.length === 0) {
            chatHistoryListDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-placeholder-text">暂无对话历史</div>`;
        } else {
            ChatModule.history.slice().reverse().forEach(convo => {
                const itemDiv = document.createElement("div");
                itemDiv.className = `${SCRIPT_PREFIX}-history-item`;
                const previewText = convo.length > 0 ? convo[0].content.substring(0, 100) + "..." : "空对话";
                itemDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-history-text" style="white-space:pre-wrap;cursor:pointer" title="点击恢复对话">${utils.escapeHtml(previewText)}</div>`;
                itemDiv.addEventListener("click", async () => {
                    if (!(await utils.confirm("要恢复此对话吗？"))) return;
                    ChatModule.restoreSession(convo);
                    switchMode("chat");
                });
                chatHistoryListDiv.prepend(itemDiv);
            });
        }

        // Render Search
        searchHistoryListDiv.innerHTML = "";
        if (SearchModule.history.length === 0) {
            searchHistoryListDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-placeholder-text">暂无搜索历史</div>`;
        } else {
            SearchModule.history.slice().reverse().forEach(item => {
                const itemDiv = document.createElement("div");
                itemDiv.className = `${SCRIPT_PREFIX}-history-item`;
                const previewText = `Q: ${item.query.substring(0, 100)}...`;
                itemDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-history-text" style="white-space:pre-wrap;cursor:pointer" title="点击恢复搜索结果">${utils.escapeHtml(previewText)}</div>`;
                itemDiv.addEventListener("click", async () => {
                    if (!(await utils.confirm("要恢复此搜索结果吗？"))) return;
                    SearchModule.restoreSession([
                        { type: 'query', content: item.query },
                        { type: 'result', answer: item.answer, sources: item.sources }
                    ]);
                    switchMode("search");
                });
                searchHistoryListDiv.prepend(itemDiv);
            });
        }
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'session' && changes.pendingTranslation) {
            processPendingTranslation();
        }
    });

    document.addEventListener('DOMContentLoaded', initialize);

})();
