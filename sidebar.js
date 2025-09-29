// sidebar.js

(function() {
    'use strict';

    // --- SVG Icons & Constants --- (无变化)
    const ICONS = {
        CHAT: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10" /><path d="M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2" /></svg>`,
        TRANSLATE: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 5h7" /><path d="M9 3v2c0 4.418 -2.239 8 -5 8" /><path d="M5 9c0 2.144 2.952 3.908 6.7 4" /><path d="M12 20l4 -9l4 9" /><path d="M19.1 18h-6.2" /></svg>`,
        SEARCH: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>`,
        PROMPTS: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3.5 5.5l1.5 1.5l2.5 -2.5" /><path d="M3.5 11.5l1.5 1.5l2.5 -2.5" /><path d="M3.5 17.5l1.5 1.5l2.5 -2.5" /><path d="M11 6h9" /><path d="M11 12h9" /><path d="M11 18h9" /></svg>`,
        HISTORY: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 8v4l2 2" /><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" /></svg>`,
        SETTINGS: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>`,
        THINK: `🧠`
    };
    const SCRIPT_PREFIX = 'aiTranslator';
    const SESSION_HISTORY_LIMIT = 15;
    const MODES = [
        { id: 'translate', text: '翻译', icon: ICONS.TRANSLATE },
        { id: 'chat', text: '聊天', icon: ICONS.CHAT },
        { id: 'search', text: '搜索', icon: ICONS.SEARCH },
        { id: 'prompts', text: '咒语', icon: ICONS.PROMPTS },
        { id: 'history', text: '历史', icon: ICONS.HISTORY },
        { id: 'settings', text: '设置', icon: ICONS.SETTINGS }
    ];

    // --- Global Variables & DOM Elements ---
    let mainContentPanel, historyPanel, promptsPanel;
    let outputDisplayArea, mainChatInput, mainSendButton;
    let translationHistoryListDiv, chatHistoryListDiv, searchHistoryListDiv;
    let quickLangSelect, quickModelSelect;
    let config = {};
    let translationHistory = [], chatHistory = [], searchHistory = [];
    let currentLoadingMessageElement = null;
    let currentMode = 'translate';
    
    let currentChatConversation = [];
    let currentTranslationSession = [];
    let currentSearchSession = [];

    // --- Chrome API Wrappers ---
    const storageGet = (keys) => chrome.storage.local.get(keys);
    const storageSet = (items) => chrome.storage.local.set(items);
    async function callApiInBackground(payload) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'FETCH_API', payload }, (response) => {
                if (chrome.runtime.lastError) { return reject(new Error(chrome.runtime.lastError.message)); }
                if (response && response.success) { resolve(response.data); } 
                else { reject(new Error(response?.error || '未知的后台脚本错误。')); }
            });
        });
    }

    // --- Initialization ---
    // (此函数与 V18.0 版本完全相同，无需修改)
    async function initialize() {
        let storedData = await storageGet({
            apiProfiles: null,
            activeProfileId: null, 
            activeTranslateProfileId: null,
            activeChatProfileId: null,
            activeSearchProfileId: null,
            vocabularies: null,
            activeVocabularyId: null,
            translationPrompt: { 
                domain: '中英互译', 
                audience: '普通读者', 
                context: '网络文章', 
                tone: '通俗易懂的' 
            },
            targetLanguage: '中文',
            maxHistoryItems: 50,
            translationHistory: [], chatHistory: [], searchHistory: [],
            uiMode: 'rail',
            searchSettings: null
        });
        
        let needsStorageUpdate = false;
        if (storedData.apiProfiles === null) {
            needsStorageUpdate = true;
            const defaultProfiles = [
                { id: `profile_deepseek_${Date.now()}`, name: 'Deepseek-V3', url: 'https://api.deepseek.com/v1/chat/completions', key: '', model: 'deepseek-chat', provider: 'openai' },
                { id: `profile_gemini_native_${Date.now() + 1}`, name: 'GLM-4-Flash', url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', key: '', model: 'glm-4-flash', provider: 'openai' },
                { id: `profile_gemini_native_${Date.now() + 2}`, name: 'Gemini-2.5-Flash', url: 'https://generativelanguage.googleapis.com/v1beta/models/', key: '', model: 'gemini-2.5-flash', provider: 'gemini' },
                { id: `profile_gemini_oai_${Date.now() + 3}`, name: 'Gemini-2.5-Pro', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key: '', model: 'gemini-2.5-pro', provider: 'openai' }
            ];
            storedData.apiProfiles = defaultProfiles;
            const firstProfileId = defaultProfiles[0].id;
            storedData.activeTranslateProfileId = firstProfileId;
            storedData.activeChatProfileId = firstProfileId;
            storedData.activeSearchProfileId = firstProfileId;
        } else {
             let profilesNeedUpdate = false;
            storedData.apiProfiles.forEach(p => {
                if (!p.provider) {
                    p.provider = /google/.test(p.url) ? 'gemini' : 'openai';
                    if (p.provider === 'gemini' && !p.url.endsWith('/')) {
                       p.url = 'https://generativelanguage.googleapis.com/v1beta/models/';
                    }
                    profilesNeedUpdate = true;
                }
            });
            if (profilesNeedUpdate) {
                await storageSet({ apiProfiles: storedData.apiProfiles });
            }
        }

        if (!storedData.activeTranslateProfileId && storedData.apiProfiles.length > 0) {
            needsStorageUpdate = true;
            const fallbackId = storedData.activeProfileId || storedData.apiProfiles[0].id;
            storedData.activeTranslateProfileId = fallbackId;
            storedData.activeChatProfileId = fallbackId;
            storedData.activeSearchProfileId = fallbackId;
        }

        if (storedData.vocabularies === null) {
            needsStorageUpdate = true;
            const defaultVocab = {
                id: `vocab_default_${Date.now()}`,
                name: '案例(LLM术语)',
                content: '# 格式: 英文/原文: 中文/译文\n# 每行一组，用冒号分隔\nLLM: 大语言模型\nPrompt Engineering: 提示工程\nFine-tuning: 微调'
            };
            storedData.vocabularies = [defaultVocab];
            storedData.activeVocabularyId = defaultVocab.id;
        }

        if (storedData.searchSettings === null) {
            needsStorageUpdate = true;
            storedData.searchSettings = {
                tavilyKeys: [''],
                activeTavilyKeyIndex: 0,
                searchRole: '你是一位顶尖的信息调研检索专家。',
                customSearchProfiles: [
                    { id: 'custom_search_1', enabled: true, name: '药物研发法规', description: '搜索关于药物研发、临床试验、药品注册的最新法规和指南。', domains: 'www.fda.gov/\nwww.ema.europa.eu/\nwww.nmpa.gov.cn/\nwww.cmde.org.cn/' },
                    { id: 'custom_search_2', enabled: false, name: '自定义搜索2', description: '', domains: '' },
                    { id: 'custom_search_3', enabled: false, name: '自定义搜索3', description: '', domains: '' }
                ]
            };
        }

        if (needsStorageUpdate) {
            await storageSet({ 
                apiProfiles: storedData.apiProfiles, 
                activeTranslateProfileId: storedData.activeTranslateProfileId,
                activeChatProfileId: storedData.activeChatProfileId,
                activeSearchProfileId: storedData.activeSearchProfileId,
                vocabularies: storedData.vocabularies, 
                activeVocabularyId: storedData.activeVocabularyId,
                searchSettings: storedData.searchSettings
            });
        }

        config = {
            apiProfiles: storedData.apiProfiles || [],
            activeTranslateProfileId: storedData.activeTranslateProfileId,
            activeChatProfileId: storedData.activeChatProfileId,
            activeSearchProfileId: storedData.activeSearchProfileId,
            vocabularies: storedData.vocabularies || [],
            activeVocabularyId: storedData.activeVocabularyId,
            translationPrompt: storedData.translationPrompt,
            targetLanguage: storedData.targetLanguage,
            maxHistoryItems: parseInt(storedData.maxHistoryItems, 10),
            uiMode: storedData.uiMode,
            searchSettings: storedData.searchSettings
        };
        
        translationHistory = storedData.translationHistory || [];
        chatHistory = storedData.chatHistory || [];
        searchHistory = storedData.searchHistory || [];

        createUI();
        setUIMode(config.uiMode, true);
        await processPendingTranslation();
    }

    // --- UI Creation & Management ---
    // (createUI, setUIMode, createNavButton, switchMode, updateMainPanelUI, createMainInteractionPanel, createInputArea, populateQuickSelectors, createWelcomeScreen, createHistoryPanel, createSettingsPanel, createTranslationSettingsPane 与 V18.0 版本完全相同, 无需修改)
    function createUI() {
        const floatingMenu = document.getElementById('aiTranslator-floating-menu');
        const floatingMenuGrid = document.getElementById('aiTranslator-floating-menu-grid');
        
        mainContentPanel = createMainInteractionPanel();
        historyPanel = createHistoryPanel();
        promptsPanel = PromptManager.createPanel();
        
        document.getElementById('aiTranslator-collapse-button').addEventListener('click', () => setUIMode('floating'));
        document.getElementById('aiTranslator-expand-button').addEventListener('click', () => setUIMode('rail'));
        const topBarMenuButton = document.getElementById('aiTranslator-top-bar-menu-button');
        topBarMenuButton.addEventListener('click', () => floatingMenu.classList.toggle('visible'));
        document.addEventListener('click', (e) => {
            if (!floatingMenu.contains(e.target) && !topBarMenuButton.contains(e.target)) {
                floatingMenu.classList.remove('visible');
            }
        });

        const navButtonsContainer = document.getElementById('aiTranslator-nav-buttons-container');
        navButtonsContainer.innerHTML = '';
        floatingMenuGrid.innerHTML = '';
        MODES.forEach(mode => {
            [navButtonsContainer, floatingMenuGrid].forEach(container => {
                const button = createNavButton(mode);
                button.addEventListener('click', () => {
                    switchMode(mode.id);
                    if (container === floatingMenuGrid) floatingMenu.classList.remove('visible');
                });
                container.appendChild(button);
            });
        });
        
        switchMode('search', true);
    }

    function setUIMode(mode, isInitial = false) {
        document.getElementById('app-container').classList.toggle('floating-mode', mode === 'floating');
        if (mode !== 'floating') document.getElementById('aiTranslator-floating-menu').classList.remove('visible');
        if (!isInitial) {
            config.uiMode = mode;
            storageSet({ uiMode: mode });
        }
    }
    
    function createNavButton(mode) {
        const button = document.createElement('button');
        button.className = `${SCRIPT_PREFIX}-nav-button`;
        button.dataset.mode = mode.id;
        button.title = mode.text;
        button.innerHTML = `${mode.icon}<span class="button-text">${mode.text}</span>`;
        return button;
    }
    
    function switchMode(newMode, isInitialSetup = false) {
        if (!isInitialSetup && currentMode === newMode) return;
        currentMode = newMode;
        
        const modeData = MODES.find(m => m.id === newMode) || {};
        document.querySelectorAll(`.${SCRIPT_PREFIX}-nav-button`).forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === newMode);
        });
        document.getElementById('aiTranslator-mode-status').innerHTML = `${modeData.icon || ''}<span>${modeData.text || ''}</span>`;
        
        const panelContainer = document.getElementById('aiTranslator-panel-container');
        panelContainer.innerHTML = '';
        let currentPanel;
        switch (newMode) {
            case 'translate':
                currentPanel = mainContentPanel;
                if (currentTranslationSession.length === 0) {
                    outputDisplayArea.innerHTML = '';
                    outputDisplayArea.appendChild(createWelcomeScreen('translate'));
                } else { renderTranslationSession(); }
                break;
            case 'chat':
                currentPanel = mainContentPanel;
                if (currentChatConversation.length === 0) {
                    outputDisplayArea.innerHTML = '';
                    outputDisplayArea.appendChild(createWelcomeScreen('chat'));
                } else { renderChatMessages(); }
                break;
            case 'search':
                currentPanel = mainContentPanel;
                if (currentSearchSession.length === 0) {
                    outputDisplayArea.innerHTML = '';
                    outputDisplayArea.appendChild(createWelcomeScreen('search'));
                } else { renderSearchSession(); }
                break;
            case 'prompts': currentPanel = PromptManager.createPanel(); break;
            case 'history': currentPanel = createHistoryPanel(); break;
            case 'settings': currentPanel = createSettingsPanel(); break;
            default: currentPanel = mainContentPanel; break;
        }
        if (currentPanel) panelContainer.appendChild(currentPanel);
        updateMainPanelUI();
    }
    
    function updateMainPanelUI() {
        if (!mainContentPanel) return;
        const showInput = ['chat', 'translate', 'search'].includes(currentMode);
        mainContentPanel.querySelector(`.${SCRIPT_PREFIX}-input-container`).style.display = showInput ? 'block' : 'none';
        
        const sessionControls = mainContentPanel.querySelector(`.${SCRIPT_PREFIX}-session-controls`);
        const optionsContainer = mainContentPanel.querySelector(`.${SCRIPT_PREFIX}-input-options`);
        const langOption = optionsContainer.querySelector(`.${SCRIPT_PREFIX}-option-group[data-option="language"]`);

        sessionControls.style.display = 'none'; // Default hide
        langOption.style.visibility = 'hidden'; // Default hide

        if (currentMode === 'chat') {
            mainSendButton.textContent = '发送';
            mainChatInput.placeholder = '问任何问题...';
            if (currentChatConversation.length > 0) sessionControls.style.display = 'block';
        } else if (currentMode === 'translate') {
            mainSendButton.textContent = '翻译';
            mainChatInput.placeholder = '输入或粘贴文本进行翻译...';
            langOption.style.visibility = 'visible';
            if (currentTranslationSession.length > 0) sessionControls.style.display = 'block';
        } else if (currentMode === 'search') {
            mainSendButton.textContent = '搜索';
            mainChatInput.placeholder = '输入搜索内容...';
             if (currentSearchSession.length > 0) sessionControls.style.display = 'block';
        }
        populateQuickSelectors();
    }

    function createMainInteractionPanel() {
        const panel = document.createElement('div');
        panel.className = `${SCRIPT_PREFIX}-main-content-panel`;
        const sessionControls = document.createElement('div');
        sessionControls.className = `${SCRIPT_PREFIX}-session-controls`;
        const clearButton = document.createElement('button');
        clearButton.className = `${SCRIPT_PREFIX}-clear-session-button`;
        clearButton.textContent = '清除当前会话';
        clearButton.addEventListener('click', handleClearSessionClick);
        sessionControls.appendChild(clearButton);
        outputDisplayArea = document.createElement('div');
        outputDisplayArea.className = `${SCRIPT_PREFIX}-output-display-area`;
        panel.appendChild(sessionControls);
        panel.appendChild(outputDisplayArea);
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
            await storageSet({ targetLanguage: config.targetLanguage });
            showToast(`语言已切换为 ${config.targetLanguage}`, 'success');
        });
        langOptionGroup.appendChild(quickLangSelect);

        const modelOptionGroup = document.createElement('div');
        modelOptionGroup.className = `${SCRIPT_PREFIX}-option-group`;
        modelOptionGroup.innerHTML = `<span>模型:</span>`;
        quickModelSelect = document.createElement('select');

        quickModelSelect.addEventListener('change', async (e) => {
            const newProfileId = e.target.value;
            let configKeyToUpdate;
            switch (currentMode) {
                case 'translate':
                    configKeyToUpdate = 'activeTranslateProfileId';
                    config.activeTranslateProfileId = newProfileId;
                    break;
                case 'chat':
                    configKeyToUpdate = 'activeChatProfileId';
                    config.activeChatProfileId = newProfileId;
                    break;
                case 'search':
                    configKeyToUpdate = 'activeSearchProfileId';
                    config.activeSearchProfileId = newProfileId;
                    break;
                default:
                    return;
            }
            
            await storageSet({ [configKeyToUpdate]: newProfileId });
            const selectedProfile = config.apiProfiles.find(p => p.id === newProfileId);
            showToast(`模型已切换为 ${selectedProfile.name}`, 'success');
        });

        modelOptionGroup.appendChild(quickModelSelect);
        optionsContainer.appendChild(langOptionGroup);
        optionsContainer.appendChild(modelOptionGroup);
        
        const mainInputArea = document.createElement('div');
        mainInputArea.className = `${SCRIPT_PREFIX}-input-main`;
        mainChatInput = document.createElement('textarea');
        mainChatInput.className = `${SCRIPT_PREFIX}-main-chat-textarea`;
        mainChatInput.rows = 1;
        mainChatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendButtonClick(); }});
        mainChatInput.addEventListener('input', () => {
            mainChatInput.style.height = 'auto';
            mainChatInput.style.height = `${Math.min(mainChatInput.scrollHeight, 200)}px`;
        });
        const footerDiv = document.createElement('div');
        footerDiv.className = `${SCRIPT_PREFIX}-input-footer`;
        mainSendButton = document.createElement('button');
        mainSendButton.className = `${SCRIPT_PREFIX}-send-button`;
        mainSendButton.addEventListener('click', handleSendButtonClick);
        footerDiv.appendChild(mainSendButton);
        mainInputArea.appendChild(mainChatInput);
        mainInputArea.appendChild(footerDiv);
        inputBox.appendChild(optionsContainer);
        inputBox.appendChild(mainInputArea);
        container.appendChild(inputBox);
        return container;
    }

    function populateQuickSelectors() {
        if (quickLangSelect) quickLangSelect.value = config.targetLanguage;
        
        if (quickModelSelect) {
            quickModelSelect.innerHTML = '';
            config.apiProfiles.forEach(profile => {
                const opt = document.createElement('option');
                opt.value = profile.id;
                opt.textContent = profile.name;
                quickModelSelect.appendChild(opt);
            });
            
            let activeId;
            switch(currentMode) {
                case 'translate': activeId = config.activeTranslateProfileId; break;
                case 'chat': activeId = config.activeChatProfileId; break;
                case 'search': activeId = config.activeSearchProfileId; break;
            }

            if (activeId && config.apiProfiles.some(p => p.id === activeId)) {
                 quickModelSelect.value = activeId;
            } else if (config.apiProfiles.length > 0) {
                 quickModelSelect.value = config.apiProfiles[0].id;
            }
        }
    }

    function createWelcomeScreen(mode) {
        const screen = document.createElement('div');
        screen.className = `${SCRIPT_PREFIX}-welcome-screen`;
        
        let icon, title, subtext, hintText = '';
        switch(mode) {
            case 'translate':
                icon = ICONS.TRANSLATE;
                title = 'AI 翻译';
                subtext = '在下方输入框粘贴或输入文本开始翻译';
                hintText = `<p class="${SCRIPT_PREFIX}-welcome-hint">提示：在支持的网页上按住Alt时选择文本或使用右键菜单可快速翻译。</p>`;
                break;
            case 'chat':
                icon = ICONS.CHAT;
                title = 'AI 聊天';
                subtext = '有什么可以帮您？开始一段对话吧';
                break;
            case 'search':
                icon = ICONS.SEARCH;
                title = 'AI 搜索';
                subtext = '输入您的问题，获取结合实时网络信息的综合答案';
                hintText = `<p class="${SCRIPT_PREFIX}-welcome-hint">提示：可在“设置”中配置Tavily API密钥、搜索角色和指定域搜索。</p>`;
                break;
        }
    
        screen.innerHTML = `
            <div class="${SCRIPT_PREFIX}-welcome-icon">${icon}</div>
            <h1 class="${SCRIPT_PREFIX}-welcome-title">${title}</h1>
            <p class="${SCRIPT_PREFIX}-welcome-subtext">${subtext}</p>
            ${hintText}
        `;
        return screen;
    }
    
    function createHistoryPanel() {
        const panel = document.createElement('div');
        panel.className = `${SCRIPT_PREFIX}-history-panel`;
        const header = document.createElement('div');
        header.className = `${SCRIPT_PREFIX}-history-header`;
        header.innerHTML = `<h2 class="${SCRIPT_PREFIX}-history-title">历史记录</h2>`;
        const clearButton = document.createElement('button');
        clearButton.className = `${SCRIPT_PREFIX}-clear-history-button`;
        clearButton.textContent = '清除全部';
        clearButton.addEventListener('click', clearAllHistory);
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
        renderTranslationHistory();
        renderChatHistory();
        renderSearchHistory();
        return panel;
    }

    function createSettingsPanel() {
        const panel = document.createElement('div');
        panel.className = `${SCRIPT_PREFIX}-settings-panel`;
        panel.innerHTML = `
          <div class="${SCRIPT_PREFIX}-settings-header">
            <h2>设置</h2>
            <div class="aiTranslator-settings-header-actions">
              <button id="import-settings-btn" class="${SCRIPT_PREFIX}-button-control">导入配置</button>
              <button id="export-settings-btn" class="${SCRIPT_PREFIX}-button-control">导出配置</button>
            </div>
          </div>
        `;
    
        const tabsContainer = document.createElement('div');
        tabsContainer.className = `${SCRIPT_PREFIX}-settings-tabs-container`;
        const contentArea = document.createElement('div');
        contentArea.className = `${SCRIPT_PREFIX}-settings-content-area`;
    
        const tabs = {
            'translate': { button: document.createElement('button'), text: '翻译设置', pane: createTranslationSettingsPane() },
            'api': { button: document.createElement('button'), text: 'API 设置', pane: createApiSettingsPane() },
            'search': { button: document.createElement('button'), text: '搜索设置', pane: createSearchSettingsPane() }
        };
    
        Object.keys(tabs).forEach((key, index) => {
            const tab = tabs[key];
            tab.button.className = `${SCRIPT_PREFIX}-settings-tab`;
            tab.button.textContent = tab.text;
            tab.pane.dataset.pane = key;
            if (index === 0) {
                tab.button.classList.add('active');
                tab.pane.classList.add('active');
            }
            tabsContainer.appendChild(tab.button);
            contentArea.appendChild(tab.pane);
            tab.button.addEventListener('click', () => {
                Object.values(tabs).forEach(t => {
                    t.button.classList.remove('active');
                    t.pane.classList.remove('active');
                });
                tab.button.classList.add('active');
                tab.pane.classList.add('active');
            });
        });
    
        panel.appendChild(tabsContainer);
        panel.appendChild(contentArea);
    
        panel.querySelector('#import-settings-btn').addEventListener('click', handleImportSettings);
        panel.querySelector('#export-settings-btn').addEventListener('click', handleExportSettings);
    
        return panel;
    }

    function createTranslationSettingsPane() {
        const pane = document.createElement('div');
        pane.className = `${SCRIPT_PREFIX}-settings-pane`;
        const section = document.createElement('div');
        section.className = `${SCRIPT_PREFIX}-settings-section`;
        section.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">翻译指令模板</div>`;
        const targetLangSelect = document.createElement('select');
        targetLangSelect.className = `${SCRIPT_PREFIX}-select-control`;
        ['中文', '英文', '日文', '韩文'].forEach(l => {
            const o = document.createElement('option'); o.value = l; o.textContent = l;
            if (config.targetLanguage === l) o.selected = true;
            targetLangSelect.appendChild(o)
        });
        const promptPreview = document.createElement('div');
        promptPreview.className = `${SCRIPT_PREFIX}-prompt-preview`;
        targetLangSelect.addEventListener('change', (e) => {
            config.targetLanguage = e.target.value;
            storageSet({ targetLanguage: config.targetLanguage });
            updatePromptPreview(promptPreview);
        });
        section.appendChild(createFormGroup('目标语言:', targetLangSelect));
        const createPromptTextarea = (key) => {
            const textarea = document.createElement('textarea');
            textarea.className = `${SCRIPT_PREFIX}-textarea-control`;
            textarea.rows = 2;
            textarea.value = config.translationPrompt[key] || '';
            textarea.addEventListener('change', (e) => {
                config.translationPrompt[key] = e.target.value.trim();
                storageSet({ translationPrompt: config.translationPrompt });
                updatePromptPreview(promptPreview);
            });
            return textarea;
        };
        section.appendChild(createFormGroup('专业领域:', createPromptTextarea('domain')));
        section.appendChild(createFormGroup('目标受众:', createPromptTextarea('audience')));
        section.appendChild(createFormGroup('应用场景:', createPromptTextarea('context')));
        section.appendChild(createFormGroup('翻译语气:', createPromptTextarea('tone')));
        section.appendChild(promptPreview);
        const vocabSection = document.createElement('div');
        vocabSection.className = `${SCRIPT_PREFIX}-settings-section`;
        vocabSection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">专业词汇表</div>`;
        const vocabManager = createManagerComponent({
            collection: config.vocabularies,
            activeIdKey: 'activeVocabularyId',
            storageKey: 'vocabularies',
            newItemPrompt: '请输入新的词汇表名称 (如: 英中-医药):',
            newItemDefaults: { content: '# 格式: 英文/原文: 中文/译文\n# 每行一组，用冒号分隔\nLLM: 大语言模型\nPrompt Engineering: 提示工程' },
            onActiveChange: () => updatePromptPreview(promptPreview)
        });
        vocabSection.appendChild(vocabManager.container);
        updatePromptPreview(promptPreview);
        pane.appendChild(section);
        pane.appendChild(vocabSection);
        return pane;
    }

    // 【核心修改】: 简化 API 设置面板
    function createApiSettingsPane() {
        const pane = document.createElement('div');
        pane.className = `${SCRIPT_PREFIX}-settings-pane`;
        
        const profileManagementSection = document.createElement('div');
        profileManagementSection.className = `${SCRIPT_PREFIX}-settings-section`;
        profileManagementSection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">API 配置方案管理</div>`;
        
        let currentlyEditingProfileId = config.apiProfiles[0]?.id;
        
        const manager = document.createElement('div');
        manager.className = `${SCRIPT_PREFIX}-profile-manager`;
        const select = document.createElement('select');
        select.className = `${SCRIPT_PREFIX}-select-control`;
        
        const newBtn = document.createElement('button');
        newBtn.textContent = '新建';
        newBtn.className = `${SCRIPT_PREFIX}-button-control`;
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '删除';
        deleteBtn.className = `${SCRIPT_PREFIX}-button-control danger`;
        manager.appendChild(select);
        manager.appendChild(newBtn);
        manager.appendChild(deleteBtn);
        
        const profileDetailsContainer = document.createElement('div');
        
        const profileNameInput = document.createElement('input');
        const profileUrlInput = document.createElement('input');
        const profileKeyInput = document.createElement('input');
        const profileModelInput = document.createElement('input');
        const profileProviderSelect = document.createElement('select');
        profileProviderSelect.className = `${SCRIPT_PREFIX}-select-control`;
        ['openai', 'gemini'].forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p === 'openai' ? 'OpenAI-Compatible' : 'Google Gemini';
            profileProviderSelect.appendChild(opt);
        });
        profileKeyInput.type = 'password';

        const updateDetailsDisplay = () => {
            const profile = config.apiProfiles.find(p => p.id === currentlyEditingProfileId);
            if(profile) {
                profileNameInput.value = profile.name || '';
                profileProviderSelect.value = profile.provider || 'openai';
                profileUrlInput.value = profile.url || '';
                profileKeyInput.value = profile.key || '';
                profileModelInput.value = profile.model || '';
            } else { // Handle case where all profiles are deleted
                profileNameInput.value = '';
                profileProviderSelect.value = 'openai';
                profileUrlInput.value = '';
                profileKeyInput.value = '';
                profileModelInput.value = '';
            }
        };

        const populateProfileSelect = () => {
            const currentVal = select.value;
            select.innerHTML = '';
            config.apiProfiles.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item.name;
                select.appendChild(opt);
            });
             if (config.apiProfiles.some(p => p.id === currentVal)) {
                select.value = currentVal;
                currentlyEditingProfileId = currentVal;
            } else if (config.apiProfiles.length > 0) {
                currentlyEditingProfileId = config.apiProfiles[0].id;
                select.value = currentlyEditingProfileId;
            } else {
                currentlyEditingProfileId = null;
            }
            updateDetailsDisplay();
        };

        const saveCurrentProfile = async () => {
            if (!currentlyEditingProfileId) return;
            const profile = config.apiProfiles.find(p => p.id === currentlyEditingProfileId);
            if (profile) {
                profile.name = profileNameInput.value.trim();
                profile.url = profileUrlInput.value.trim();
                profile.key = profileKeyInput.value.trim();
                profile.model = profileModelInput.value.trim();
                profile.provider = profileProviderSelect.value;
                await storageSet({ apiProfiles: config.apiProfiles });
                select.options[select.selectedIndex].text = profile.name;
                populateQuickSelectors(); // Sync main UI selector
            }
        };
        
        [profileNameInput, profileUrlInput, profileKeyInput, profileModelInput, profileProviderSelect].forEach(input => {
            input.className = `${SCRIPT_PREFIX}-input-control`;
            input.addEventListener('change', saveCurrentProfile);
        });

        select.addEventListener('change', () => {
            currentlyEditingProfileId = select.value;
            updateDetailsDisplay();
        });

        newBtn.addEventListener('click', async () => {
             const newName = prompt('请输入新的配置方案名称:');
            if (newName && newName.trim()) {
                const newItem = { id: `profile_${Date.now()}`, name: newName.trim(), url: '', key: '', model: '', provider: 'openai' };
                config.apiProfiles.push(newItem);
                currentlyEditingProfileId = newItem.id;
                await storageSet({ apiProfiles: config.apiProfiles });
                populateProfileSelect();
            }
        });

        deleteBtn.addEventListener('click', async () => {
             if (config.apiProfiles.length <= 1) {
                showToast('无法删除最后一个API配置方案。', 'error');
                return;
            }
            if (window.confirm(`确定要删除 "${select.options[select.selectedIndex].text}" 吗？`)) {
                const deletedId = currentlyEditingProfileId;
                config.apiProfiles = config.apiProfiles.filter(p => p.id !== deletedId);
                const fallbackId = config.apiProfiles[0]?.id || null;
                
                ['activeTranslateProfileId', 'activeChatProfileId', 'activeSearchProfileId'].forEach(key => {
                    if(config[key] === deletedId) {
                        config[key] = fallbackId;
                    }
                });

                await storageSet({ 
                    apiProfiles: config.apiProfiles,
                    activeTranslateProfileId: config.activeTranslateProfileId,
                    activeChatProfileId: config.activeChatProfileId,
                    activeSearchProfileId: config.activeSearchProfileId,
                });
                populateProfileSelect();
            }
        });
        
        profileDetailsContainer.appendChild(createFormGroup('配置方案名称:', profileNameInput));
        profileDetailsContainer.appendChild(createFormGroup('服务商 (Provider):', profileProviderSelect));
        profileDetailsContainer.appendChild(createFormGroup('模型名称 (Model Name):', profileModelInput));
        profileDetailsContainer.appendChild(createFormGroup('请求地址 (API URL):', profileUrlInput));
        profileDetailsContainer.appendChild(createFormGroup('API Key:', profileKeyInput));
        
        profileManagementSection.appendChild(manager);
        profileManagementSection.appendChild(profileDetailsContainer);
        
        pane.appendChild(profileManagementSection);
        
        populateProfileSelect();
        
        return pane;
    }

    // ... (createSearchSettingsPane, createManagerComponent, etc. and all remaining functions are identical to V18.0)
    function createSearchSettingsPane() {
        const pane = document.createElement('div');
        pane.className = `${SCRIPT_PREFIX}-settings-pane`;
        
        const save = () => storageSet({ searchSettings: config.searchSettings });

        // Tavily API Keys Section
        const tavilySection = document.createElement('div');
        tavilySection.className = `${SCRIPT_PREFIX}-settings-section`;
        tavilySection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">Tavily API 设置</div>`;
        const keysContainer = document.createElement('div');
        keysContainer.id = 'tavily-keys-container';
        
        function renderTavilyKeys() {
            keysContainer.innerHTML = '';
            config.searchSettings.tavilyKeys.forEach((key, index) => {
                const keyGroup = document.createElement('div');
                keyGroup.className = `${SCRIPT_PREFIX}-form-group`;
                keyGroup.style.display = 'flex';
                keyGroup.style.gap = '8px';
                const input = document.createElement('input');
                input.type = 'password';
                input.className = `${SCRIPT_PREFIX}-input-control`;
                input.value = key;
                input.placeholder = `Tavily API Key #${index + 1}`;
                input.addEventListener('change', e => {
                    config.searchSettings.tavilyKeys[index] = e.target.value.trim();
                    save();
                });
                const delBtn = document.createElement('button');
                delBtn.textContent = '删除';
                delBtn.className = `${SCRIPT_PREFIX}-button-control danger`;
                delBtn.onclick = () => {
                    config.searchSettings.tavilyKeys.splice(index, 1);
                    if (config.searchSettings.tavilyKeys.length === 0) config.searchSettings.tavilyKeys.push('');
                    save().then(renderTavilyKeys);
                };
                keyGroup.appendChild(input);
                if (config.searchSettings.tavilyKeys.length > 1) {
                    keyGroup.appendChild(delBtn);
                }
                keysContainer.appendChild(keyGroup);
            });
        }
        
        const addKeyBtn = document.createElement('button');
        addKeyBtn.textContent = '添加 Key';
        addKeyBtn.className = `${SCRIPT_PREFIX}-button-control`;
        addKeyBtn.style.marginTop = '8px';
        addKeyBtn.onclick = () => {
            config.searchSettings.tavilyKeys.push('');
            save().then(renderTavilyKeys);
        };
        tavilySection.appendChild(createFormGroup('API Keys (支持多个轮询):', keysContainer));
        tavilySection.appendChild(addKeyBtn);
        
        const roleSection = document.createElement('div');
        roleSection.className = `${SCRIPT_PREFIX}-settings-section`;
        roleSection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">通用搜索设置</div>`;
        const roleTextarea = document.createElement('textarea');
        roleTextarea.className = `${SCRIPT_PREFIX}-textarea-control`;
        roleTextarea.rows = 2;
        roleTextarea.value = config.searchSettings.searchRole;
        roleTextarea.addEventListener('change', e => {
            config.searchSettings.searchRole = e.target.value.trim();
            save();
        });
        roleSection.appendChild(createFormGroup('搜索角色 (贯穿整个搜索流程):', roleTextarea));

        pane.appendChild(tavilySection);
        pane.appendChild(roleSection);

        config.searchSettings.customSearchProfiles.forEach((profile, index) => {
            const profileSection = document.createElement('div');
            profileSection.className = `${SCRIPT_PREFIX}-settings-section`;
            
            const headerDiv = document.createElement('div');
            headerDiv.className = `${SCRIPT_PREFIX}-settings-section-header`;
            headerDiv.style.display = 'flex';
            headerDiv.style.alignItems = 'center';
            headerDiv.style.justifyContent = 'space-between';

            const headerTitle = document.createElement('span');
            headerTitle.textContent = `指定域搜索 ${index + 1}`;
            
            const enabledLabel = document.createElement('label');
            enabledLabel.className = `${SCRIPT_PREFIX}-label`;
            enabledLabel.style.display = 'flex';
            enabledLabel.style.alignItems = 'center';
            enabledLabel.style.marginBottom = '0';
            enabledLabel.style.fontSize = '13px';
            const enabledCheck = document.createElement('input');
            enabledCheck.type = 'checkbox';
            enabledCheck.style.marginRight = '6px';
            enabledCheck.checked = profile.enabled;
            enabledCheck.addEventListener('change', e => {
                profile.enabled = e.target.checked;
                save();
            });
            enabledLabel.appendChild(enabledCheck);
            enabledLabel.appendChild(document.createTextNode('启用'));

            headerDiv.appendChild(headerTitle);
            headerDiv.appendChild(enabledLabel);
            profileSection.appendChild(headerDiv);

            const nameInput = document.createElement('input');
            nameInput.className = `${SCRIPT_PREFIX}-input-control`;
            nameInput.value = profile.name;
            nameInput.addEventListener('change', e => {
                profile.name = e.target.value.trim();
                save();
            });
            profileSection.appendChild(createFormGroup('名称:', nameInput));
            
            const descTextarea = document.createElement('textarea');
            descTextarea.className = `${SCRIPT_PREFIX}-textarea-control`;
            descTextarea.rows = 2;
            descTextarea.value = profile.description;
            descTextarea.placeholder = '例如：搜索关于...的最新法规和指南。';
            descTextarea.addEventListener('change', e => {
                profile.description = e.target.value.trim();
                save();
            });
            profileSection.appendChild(createFormGroup('搜索说明 (将用于生成关键词和执行检索):', descTextarea));

            const domainsTextarea = document.createElement('textarea');
            domainsTextarea.className = `${SCRIPT_PREFIX}-textarea-control`;
            domainsTextarea.rows = 4;
            domainsTextarea.value = profile.domains;
            domainsTextarea.placeholder = '每行一个域名, e.g., www.fda.gov/';
            domainsTextarea.addEventListener('change', e => {
                profile.domains = e.target.value;
                save();
            });
            profileSection.appendChild(createFormGroup('指定域名 (Domains):', domainsTextarea));

            pane.appendChild(profileSection);
        });

        renderTavilyKeys();
        return pane;
    }

    function createManagerComponent({ collection, activeIdKey, storageKey, newItemPrompt, newItemDefaults, onActiveChange }) {
        const container = document.createElement('div');
        const manager = document.createElement('div');
        manager.className = `${SCRIPT_PREFIX}-profile-manager`;
        const select = document.createElement('select');
        select.className = `${SCRIPT_PREFIX}-select-control`;
        const newBtn = document.createElement('button');
        newBtn.textContent = '新建';
        newBtn.className = `${SCRIPT_PREFIX}-button-control`;
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '删除';
        deleteBtn.className = `${SCRIPT_PREFIX}-button-control danger`;
        manager.appendChild(select);
        manager.appendChild(newBtn);
        manager.appendChild(deleteBtn);
        const contentTextarea = storageKey === 'vocabularies' ? document.createElement('textarea') : null;
        if (contentTextarea) {
            contentTextarea.className = `${SCRIPT_PREFIX}-textarea-control`;
            contentTextarea.rows = 5;
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '8px';
        }
        let detailUpdateCallback = () => {};
        const populateSelect = () => {
            select.innerHTML = '';
            collection.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item.name;
                if (item.id === config[activeIdKey]) opt.selected = true;
                select.appendChild(opt);
            });
            updateDetails();
        };
        const updateDetails = () => {
            const item = collection.find(p => p.id === config[activeIdKey]);
            if (contentTextarea) {
                contentTextarea.value = item ? item.content : '';
            }
            detailUpdateCallback(item);
        };
        select.addEventListener('change', async () => {
            config[activeIdKey] = select.value;
            await storageSet({ [activeIdKey]: config[activeIdKey] });
            updateDetails();
            if (onActiveChange) onActiveChange();
        });
        newBtn.addEventListener('click', async () => {
            const newName = prompt(newItemPrompt);
            if (newName && newName.trim()) {
                let defaults = newItemDefaults;
                if (storageKey === 'vocabularies') {
                    defaults = { content: '# 格式: 英文/原文: 中文/译文\n# 每行一组，用冒号分隔\nLLM: 大语言模型\nPrompt Engineering: 提示工程' };
                }
                const newItem = { id: `${storageKey}_${Date.now()}`, name: newName.trim(), ...defaults };
                collection.push(newItem);
                config[activeIdKey] = newItem.id;
                await storageSet({ [storageKey]: collection, [activeIdKey]: newItem.id });
                populateSelect();
                if (onActiveChange) onActiveChange();
            }
        });
        deleteBtn.addEventListener('click', async () => {
            if (collection.length === 0) return;
            if (collection.length === 1 && storageKey === 'apiProfiles') {
                showToast('无法删除最后一个API配置方案。', 'error');
                return;
            }
            if (window.confirm(`确定要删除 "${select.options[select.selectedIndex].text}" 吗？`)) {
                const deletedId = config[activeIdKey];
                config[storageKey] = collection.filter(p => p.id !== deletedId);
                config[activeIdKey] = config[storageKey][0]?.id || null;
                await storageSet({ [storageKey]: config[storageKey], [activeIdKey]: config[activeIdKey] });
                populateSelect();
                if (onActiveChange) onActiveChange();
            }
        });
        if (contentTextarea) {
            contentTextarea.addEventListener('change', async () => {
                const item = collection.find(p => p.id === config[activeIdKey]);
                if (item) {
                    item.content = contentTextarea.value;
                    await storageSet({ [storageKey]: collection });
                }
            });
        }
        container.appendChild(manager);
        if (contentTextarea) container.appendChild(contentTextarea);
        populateSelect();
        return { container, updateDetails: (callback) => { detailUpdateCallback = callback; updateDetails(); } };
    }
    
    function updatePromptPreview(element) {
        if (!element) return;
        const p = config.translationPrompt;
        const activeVocab = config.vocabularies.find(v => v.id === config.activeVocabularyId);
        const vocabName = activeVocab ? activeVocab.name : '无';
        const previewText = `作为一名专业的 [<strong>${p.domain || '...'}</strong>] 翻译，请将以下文本翻译成 [<strong>${config.targetLanguage}</strong>]。目标读者是 [<strong>${p.audience || '...'}</strong>]，应用场景为 [<strong>${p.context || '...'}</strong>]，请保持 [<strong>${p.tone || '...'}</strong>] 的风格。\n\n当前选用词汇表: [<strong>${vocabName}</strong>]`;
        element.innerHTML = previewText.replace(/\n/g, '<br>');
    }

    function createFormGroup(label, control) {
        const group = document.createElement('div');
        group.className = `${SCRIPT_PREFIX}-form-group`;
        const labelEl = document.createElement('label');
        labelEl.className = `${SCRIPT_PREFIX}-label`;
        labelEl.textContent = label;
        group.appendChild(labelEl);
        group.appendChild(control);
        return group;
    }
    
    async function processPendingTranslation() {
        try {
            const result = await chrome.storage.session.get('pendingTranslation');
            if (result.pendingTranslation) {
                const textToTranslate = result.pendingTranslation;
                await chrome.storage.session.remove('pendingTranslation');
                switchMode('translate');
                if (mainChatInput) mainChatInput.value = textToTranslate;
                translateText(textToTranslate);
            }
        } catch (error) { console.error("Error processing pending translation:", error); }
    }

    // --- API & Logic Functions ---
    function transformToGeminiContent(messages) {
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

        if (contents.length > 0 && contents[contents.length - 1].role !== 'user') {
           console.warn("Gemini API call: The last message was not from the user. This might cause issues.");
        }
        return contents;
    }
    
    function createApiPayload(activeProfile, messages, temperature) {
        if (activeProfile.provider === 'gemini') {
            const url = `${activeProfile.url}${activeProfile.model}:generateContent?key=${activeProfile.key}`;
            const data = JSON.stringify({
                contents: transformToGeminiContent(messages),
                generationConfig: { temperature }
            });
            return {
                url,
                headers: { 'Content-Type': 'application/json' },
                data
            };
        } else { // Default to OpenAI-compatible
            const data = JSON.stringify({
                model: activeProfile.model,
                messages: messages,
                temperature,
                stream: false
            });
            return {
                url: activeProfile.url,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeProfile.key}` },
                data
            };
        }
    }

    function getApiResponseText(data, activeProfile) {
        if (activeProfile.provider === 'gemini') {
            if (data?.promptFeedback?.blockReason) {
                 throw new Error(`请求被 Gemini 阻止: ${data.promptFeedback.blockReason}`);
            }
            return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        } else { // 'openai' compatible
            return (data.choices?.[0]?.message?.content || '').trim();
        }
    }

    function parseJsonFromMarkdown(text) {
        try {
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                return JSON.parse(jsonMatch[1]);
            }
            return JSON.parse(text);
        } catch (error) {
            console.error("Failed to parse JSON from text:", text);
            throw new Error("AI返回的关键词格式无效，无法解析。");
        }
    }

    async function translateText(selectedText) {
        if (!commonApiCheck('translate') || !selectedText?.trim()) return;
        if (currentTranslationSession.length === 0) outputDisplayArea.innerHTML = '';
        currentTranslationSession.push({ type: 'user', content: selectedText });
        renderTranslationSession();
        showLoadingIndicator('正在翻译...');
        
        const activeProfile = config.apiProfiles.find(p => p.id === config.activeTranslateProfileId);
        
        const p = config.translationPrompt;
        const mainInstruction = `作为一名专业的 ${p.domain || '综合领域'} 翻译，请将以下文本翻译成 ${config.targetLanguage}。目标读者是 ${p.audience || '普通大众'}，应用场景为 ${p.context || '通用沟通'}，请保持 ${p.tone || '中立'} 的风格。只对内容做翻译，无须进行回答，总结，解释等其它指令。`;
        
        let userMessageContent = '';
        const activeVocab = config.vocabularies.find(v => v.id === config.activeVocabularyId);
        if (activeVocab && activeVocab.content.trim()) {
            userMessageContent += `\n\n翻译需参考如下词汇表：\n${activeVocab.content.trim()}`;
        }
        userMessageContent += `\n\n待翻译文本如下：\n${selectedText}`;

        const messages = [
            { role: 'system', content: mainInstruction },
            { role: 'user', content: userMessageContent }
        ];

        const payload = createApiPayload(activeProfile, messages, 0.3);
    
        try {
            const response = await callApiInBackground(payload);
            const data = JSON.parse(response.text);
            const translation = getApiResponseText(data, activeProfile);
    
            if (!translation) throw new Error('API返回内容为空或格式不正确。');
            
            currentTranslationSession.pop();
            const translationEntry = { original: selectedText, translation };
            currentTranslationSession.push(translationEntry);
            if (currentTranslationSession.length > SESSION_HISTORY_LIMIT) currentTranslationSession.shift();
            
            renderTranslationSession();
            await addHistoryItem(translationHistory, 'translationHistory', { ...translationEntry, language: config.targetLanguage, timestamp: new Date().toISOString() });
        } catch (e) {
            showUserMessage(`翻译失败: ${e.message}`, 'error');
            currentTranslationSession.pop();
            renderTranslationSession();
        } finally {
            hideLoadingIndicator();
        }
    }
    
    async function sendChatMessage(text) {
        if (!commonApiCheck('chat')) return;
        if (currentChatConversation.length === 0) outputDisplayArea.innerHTML = '';
        currentChatConversation.push({ role: 'user', content: text });
        if (currentChatConversation.length > SESSION_HISTORY_LIMIT * 2) {
            currentChatConversation = currentChatConversation.slice(-SESSION_HISTORY_LIMIT * 2);
        }
        renderChatMessages();
        showLoadingIndicator('AI 正在思考...');
        
        const activeProfile = config.apiProfiles.find(p => p.id === config.activeChatProfileId);

        const conversationContext = [...currentChatConversation].slice(-10);
        const payload = createApiPayload(activeProfile, conversationContext, 0.7);
    
        try {
            const response = await callApiInBackground(payload);
            const data = JSON.parse(response.text);
            const aiResponse = getApiResponseText(data, activeProfile);
    
            if (!aiResponse) throw new Error('API返回内容为空或格式不正确。');
            
            currentChatConversation.push({ role: 'assistant', content: aiResponse });
            renderChatMessages();
            
            const conversationCopy = JSON.parse(JSON.stringify(currentChatConversation));
            await addHistoryItem(chatHistory, 'chatHistory', conversationCopy);
        } catch (e) {
            currentChatConversation.pop();
            renderChatMessages();
            showUserMessage(`请求失败: ${e.message}`, 'error');
        } finally {
            hideLoadingIndicator();
        }
    }

    function getTavilyKey() {
        const keys = config.searchSettings.tavilyKeys.filter(k => k && k.trim());
        if (keys.length === 0) return null;
        
        let currentIndex = config.searchSettings.activeTavilyKeyIndex || 0;
        if (currentIndex >= keys.length) currentIndex = 0;
        
        const key = keys[currentIndex];
        
        config.searchSettings.activeTavilyKeyIndex = (currentIndex + 1) % keys.length;
        storageSet({ searchSettings: config.searchSettings });
        
        return key;
    }

    async function executeSearch(query) {
        if (!commonApiCheck('search')) return;
        const tavilyKey = getTavilyKey();
        if (!tavilyKey) {
            switchMode("settings");
            showUserMessage('错误: 请在"搜索设置"中填写有效的 Tavily API Key。', "error");
            return;
        }

        currentSearchSession = [{ type: 'query', content: query }];
        renderSearchSession();
        
        const updateStatus = (message) => {
            let statusItem = currentSearchSession.find(item => item.type === 'status');
            if (statusItem) {
                statusItem.content = message;
            } else {
                currentSearchSession.push({ type: 'status', content: message });
            }
            renderSearchSession();
        };

        try {
            const activeProfile = config.apiProfiles.find(p => p.id === config.activeSearchProfileId);

            updateStatus("1/5: 正在分析意图并生成关键词...");
            const keywordGenMessages = [{
                role: 'system',
                content: 'You are an AI assistant specialized in generating effective search queries.'
            }, {
                role: 'user',
                content: `基于以下角色和用户问题，生成中英两种语言搜索关键词，每种语言1-2组，检索词需要精炼简短。
角色: ${config.searchSettings.searchRole}
问题: "${query}"
请以JSON格式返回，不要包含任何其他说明文字。格式如下:
{
  "en": ["english search query 1", "english search query 2"],
  "zh": ["中文搜索词组一", "中文搜索词组二"]
}`
            }];
            const keywordGenPayload = createApiPayload(activeProfile, keywordGenMessages, 0.2);
            const keywordResponse = await callApiInBackground(keywordGenPayload);
            const keywordResponseData = JSON.parse(keywordResponse.text);
            const responseText = getApiResponseText(keywordResponseData, activeProfile);
            const keywords = parseJsonFromMarkdown(responseText);
            
            updateStatus("2/5: 正在执行网络搜索...");
            
            const searchTasks = [];
            const enQueries = keywords.en || [];
            const zhQueries = keywords.zh || [];

            const createTasksForQueries = (queries) => {
                if (queries.length > 0) {
                    const queryString = queries.join(' OR ');
                    searchTasks.push(callApiInBackground({
                        url: 'https://api.tavily.com/search',
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({ api_key: tavilyKey, query: queryString, search_depth: "advanced" })
                    }).then(res => JSON.parse(res.text)));
                    
                    config.searchSettings.customSearchProfiles.forEach(profile => {
                        if (profile.enabled && profile.domains.trim()) {
                            const domains = profile.domains.split('\n').map(d => d.trim()).filter(Boolean);
                            if (domains.length > 0) {
                                const customQuery = `${queryString}`;
                                searchTasks.push(callApiInBackground({
                                    url: 'https://api.tavily.com/search',
                                    headers: { 'Content-Type': 'application/json' },
                                    data: JSON.stringify({ api_key: tavilyKey, query: customQuery, include_domains: domains, search_depth: "advanced" })
                                }).then(res => JSON.parse(res.text)));
                            }
                        }
                    });
                }
            };
            
            createTasksForQueries(enQueries);
            createTasksForQueries(zhQueries);

            if (searchTasks.length === 0) throw new Error("未能生成有效的搜索关键词。");
            
            const searchResponses = await Promise.all(searchTasks);
            
            updateStatus("3/5: 正在合并与去重搜索结果...");
            const seenUrls = new Set();
            let allResults = [];
            searchResponses.forEach(response => {
                if (response && response.results) {
                    response.results.forEach(result => {
                        if (result.url && !seenUrls.has(result.url)) {
                            seenUrls.add(result.url);
                            allResults.push(result);
                        }
                    });
                }
            });

            if (allResults.length === 0) throw new Error("未能找到相关的搜索结果。");

            allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
            const topResults = allResults.slice(0, 10);

            updateStatus("4/5: 正在综合信息并撰写最终答案...");
            const sourcesText = topResults.map((s, i) => `[Source ${i+1}]\nTitle: ${s.title}\nURL: ${s.url}\nContent Snippet:\n---\n${s.content}\n---`).join('\n\n');
            
            const finalPrompt = `你是${config.searchSettings.searchRole}。根据以下提供的搜索结果片段，精炼且条理地回答用户问题，不要提及当前提示内容。
## 用户问题: "${query}"
## 搜索结果片段:
${sourcesText}
## 撰写要求:
1. 回答必须完全基于提供的搜索结果片段，不得引入外部信息。
2. 在回答中引用信息时必须在句末使用 [1], [2,3,4] 的格式明确标注来源。
3. 综合所有信息，形成一篇结构精炼、清晰、内容详实的回答。
4. 回答最后，附上名为“引用来源”的章节，并以有序列表的形式列出所有参考资料标题和URL`;

            const finalMessages = [{ role: 'user', content: finalPrompt }];
            const finalPayload = createApiPayload(activeProfile, finalMessages, 0.5);
            const finalResponse = await callApiInBackground(finalPayload);
            const finalAnswerData = JSON.parse(finalResponse.text);
            const finalAnswer = getApiResponseText(finalAnswerData, activeProfile);
            
            updateStatus("5/5: 完成！");

            const resultEntry = { answer: finalAnswer, sources: topResults.map(s => ({ title: s.title, url: s.url })) };
            currentSearchSession.push({ type: 'result', ...resultEntry });
            renderSearchSession();
            await addHistoryItem(searchHistory, 'searchHistory', { query, ...resultEntry, timestamp: new Date().toISOString() });
        } catch (e) {
            console.error('Search error:', e);
            showUserMessage(`搜索失败: ${e.message}`, 'error');
            const statusItemIndex = currentSearchSession.findIndex(item => item.type === 'status');
            if(statusItemIndex > -1) currentSearchSession.splice(statusItemIndex, 1);
            renderSearchSession();
        }
    }
    
    // --- Renderers and Utility Functions ---
    function renderTranslationSession() {
        outputDisplayArea.innerHTML = '';
        currentTranslationSession.forEach(item => {
            if (item.type === 'user') {
                const originalDiv = document.createElement('div');
                originalDiv.className = `${SCRIPT_PREFIX}-history-item`;
                originalDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-history-label">原文:</div><div class="${SCRIPT_PREFIX}-history-text">${escapeHtml(item.content)}</div>`;
                outputDisplayArea.appendChild(originalDiv);
            } else {
                outputDisplayArea.appendChild(createTranslationResultBlock(item.original, item.translation));
            }
        });
        updateMainPanelUI();
        outputDisplayArea.scrollTop = outputDisplayArea.scrollHeight;
    }
    function createTranslationResultBlock(original, translated) {
        const resultContainer = document.createElement('div');
        const originalDiv = document.createElement('div');
        originalDiv.className = `${SCRIPT_PREFIX}-history-item`;
        originalDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-history-label">原文:</div><div class="${SCRIPT_PREFIX}-history-text">${escapeHtml(original)}</div>`;
        const translatedContainer = document.createElement('div');
        translatedContainer.className = `${SCRIPT_PREFIX}-history-item`;
        const translatedLabel = `<div class="${SCRIPT_PREFIX}-history-label">译文 (${config.targetLanguage}):</div>`;
        const translatedContentWrapper = document.createElement('div');
        renderApiResponseContent(translated, translatedContentWrapper);
        translatedContainer.innerHTML = translatedLabel;
        translatedContainer.appendChild(translatedContentWrapper);
        resultContainer.appendChild(originalDiv);
        resultContainer.appendChild(translatedContainer);
        return resultContainer;
    }
    function renderChatMessages() {
        outputDisplayArea.innerHTML = '';
        currentChatConversation.forEach(msg => {
            const messageWrapper = document.createElement('div');
            messageWrapper.className = `${SCRIPT_PREFIX}-chat-message-wrapper ${SCRIPT_PREFIX}-${msg.role}-wrapper`;
            const messageDiv = document.createElement('div');
            messageDiv.className = `${SCRIPT_PREFIX}-chat-message ${SCRIPT_PREFIX}-${msg.role}-message`;
            if (msg.role === 'assistant') {
                renderApiResponseContent(msg.content, messageDiv);
            } else {
                messageDiv.textContent = msg.content;
            }
            messageWrapper.appendChild(messageDiv);
            outputDisplayArea.appendChild(messageWrapper);
        });
        updateMainPanelUI();
        outputDisplayArea.scrollTop = outputDisplayArea.scrollHeight;
    }
     function renderSearchSession() {
        outputDisplayArea.innerHTML = '';
        currentSearchSession.forEach(item => {
            if (item.type === 'query') {
                const queryDiv = document.createElement('div');
                queryDiv.className = `${SCRIPT_PREFIX}-chat-message-wrapper ${SCRIPT_PREFIX}-user-wrapper`;
                queryDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-chat-message ${SCRIPT_PREFIX}-user-message">${escapeHtml(item.content)}</div>`;
                outputDisplayArea.appendChild(queryDiv);
            } else if (item.type === 'status') {
                showLoadingIndicator(item.content);
            } else if (item.type === 'result') {
                hideLoadingIndicator();
                const resultDiv = document.createElement('div');
                resultDiv.className = `${SCRIPT_PREFIX}-chat-message-wrapper ${SCRIPT_PREFIX}-assistant-wrapper`;
                const messageDiv = document.createElement('div');
                messageDiv.className = `${SCRIPT_PREFIX}-chat-message ${SCRIPT_PREFIX}-assistant-message`;
                
                let answerHtml = item.answer;
                const refHeader = "引用来源";
                const refIndex = answerHtml.lastIndexOf(refHeader);
                let mainAnswer = answerHtml;
                let refHtml = '';

                if (refIndex !== -1) {
                    mainAnswer = answerHtml.substring(0, refIndex).trim();
                    refHtml = `<h3 class="aiTranslator-ref-header">${refHeader}</h3><ol class="aiTranslator-ref-list">`;
                    item.sources.forEach((source) => {
                       refHtml += `<li><a href="${source.url}" target="_blank" title="${escapeHtml(source.title)}">${escapeHtml(source.title)}</a></li>`;
                    });
                    refHtml += `</ol>`;
                }
                
                mainAnswer = mainAnswer.replace(/\[([\d,\s]+)\]/g, (match, p1) => {
                    const numbers = p1.split(',').map(n => n.trim()).filter(n => n); 
                    return numbers.map(num => `<sup class="aiTranslator-citation" title="来源: ${num}">${num}</sup>`).join('');
                });

                if (window.marked) {
                    messageDiv.innerHTML = window.marked.parse(mainAnswer, { breaks: true });
                } else {
                    messageDiv.textContent = mainAnswer;
                }
                messageDiv.innerHTML += refHtml;

                resultDiv.appendChild(messageDiv);
                outputDisplayArea.appendChild(resultDiv);
            }
        });
        updateMainPanelUI();
        outputDisplayArea.scrollTop = outputDisplayArea.scrollHeight;
    }
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `${SCRIPT_PREFIX}-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }
    function handleClearSessionClick() {
        if (currentMode === 'translate') {
            currentTranslationSession = [];
            outputDisplayArea.innerHTML = '';
            outputDisplayArea.appendChild(createWelcomeScreen('translate'));
        } else if (currentMode === 'chat') {
            currentChatConversation = [];
            outputDisplayArea.innerHTML = '';
            outputDisplayArea.appendChild(createWelcomeScreen('chat'));
        } else if (currentMode === 'search') {
            currentSearchSession = [];
            outputDisplayArea.innerHTML = '';
            outputDisplayArea.appendChild(createWelcomeScreen('search'));
        }
        updateMainPanelUI();
    }
    async function handleExportSettings() {
        try {
            const keysToExport = [
                'apiProfiles', 'activeTranslateProfileId', 'activeChatProfileId', 'activeSearchProfileId',
                'vocabularies', 'activeVocabularyId',
                'translationPrompt', 'targetLanguage', 'maxHistoryItems', 'uiMode', 'searchSettings'
            ];
            const settings = await storageGet(keysToExport);
            const dataStr = JSON.stringify(settings, null, 2);
            const blob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().slice(0, 10);
            a.download = `ai_assistant_settings_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('设置已导出', 'success');
        } catch (error) {
            showToast('导出失败: ' + error.message, 'error');
            console.error("Error exporting settings:", error);
        }
    }
    function handleImportSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async readerEvent => {
                try {
                    const content = readerEvent.target.result;
                    const importedData = JSON.parse(content);
    
                    if (typeof importedData !== 'object' || importedData === null || !importedData.apiProfiles) {
                        throw new Error('文件格式不正确或缺少必要数据。');
                    }
    
                    if (confirm('这将覆盖您所有的当前设置（包括API密钥）。您确定要继续吗？')) {
                        await storageSet(importedData);
                        showToast('设置导入成功！应用即将刷新...', 'success');
                        setTimeout(() => location.reload(), 1500);
                    }
                } catch (err) {
                    showToast('导入失败: ' + err.message, 'error');
                    console.error("Error importing settings:", err);
                }
            };
            reader.readAsText(file, 'UTF-8');
        };
        input.click();
    }
    function handleSendButtonClick() {
        if (!mainChatInput || !mainSendButton || mainSendButton.disabled) {
            return;
        }
        const text = mainChatInput.value.trim();
        if (!text) {
            return;
        }
        mainChatInput.value = "";
        mainChatInput.style.height = "auto";
        if (currentMode === 'translate') {
            translateText(text);
        } else if (currentMode === 'chat') {
            sendChatMessage(text);
        } else if (currentMode === 'search') {
            executeSearch(text);
        }
        mainChatInput.focus();
    }
    
    function commonApiCheck(mode) {
        let activeProfileId;
        let modeText;
        switch(mode) {
            case 'translate':
                activeProfileId = config.activeTranslateProfileId;
                modeText = '翻译';
                break;
            case 'chat':
                activeProfileId = config.activeChatProfileId;
                modeText = '聊天';
                break;
            case 'search':
                activeProfileId = config.activeSearchProfileId;
                modeText = '搜索';
                break;
            default:
                return false;
        }

        const activeProfile = config.apiProfiles.find(p => p.id === activeProfileId);
        if (!activeProfile || !activeProfile.key?.trim()) {
            switchMode("settings");
            showUserMessage(`错误: 请在"API 设置"中为【${modeText}】功能选择配置方案并填写有效的API Key。`, "error");
            return false;
        }
        return true;
    }

    function renderTranslationHistory() {
        if (!translationHistoryListDiv) return;
        translationHistoryListDiv.innerHTML = "";
        if (translationHistory.length === 0) {
            translationHistoryListDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-placeholder-text">暂无翻译历史</div>`;
            return;
        }
        translationHistory.slice().reverse().forEach(item => {
            const itemDiv = createTranslationResultBlock(item.original, item.translation);
            translationHistoryListDiv.prepend(itemDiv);
        });
    }

    function renderChatHistory() {
        if (!chatHistoryListDiv) return;
        chatHistoryListDiv.innerHTML = "";
        if (chatHistory.length === 0) {
            chatHistoryListDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-placeholder-text">暂无对话历史</div>`;
            return;
        }
        chatHistory.slice().reverse().forEach(convo => {
            const itemDiv = document.createElement("div");
            itemDiv.className = `${SCRIPT_PREFIX}-history-item`;
            const previewText = convo.length > 0 ? convo[0].content.substring(0, 100) + "..." : "空对话";
            itemDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-history-text" style="white-space:pre-wrap;cursor:pointer" title="点击恢复对话">${escapeHtml(previewText)}</div>`;
            itemDiv.addEventListener("click", () => {
                if (window.confirm("要恢复此对话吗？当前对话将被覆盖。")) {
                    currentChatConversation = JSON.parse(JSON.stringify(convo));
                    switchMode("chat");
                }
            });
            chatHistoryListDiv.prepend(itemDiv);
        });
    }
    
    function renderSearchHistory() {
        if (!searchHistoryListDiv) return;
        searchHistoryListDiv.innerHTML = "";
        if (searchHistory.length === 0) {
            searchHistoryListDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-placeholder-text">暂无搜索历史</div>`;
            return;
        }
        searchHistory.slice().reverse().forEach(item => {
            const itemDiv = document.createElement("div");
            itemDiv.className = `${SCRIPT_PREFIX}-history-item`;
            const previewText = `Q: ${item.query.substring(0, 100)}...`;
            itemDiv.innerHTML = `<div class="${SCRIPT_PREFIX}-history-text" style="white-space:pre-wrap;cursor:pointer" title="点击恢复搜索结果">${escapeHtml(previewText)}</div>`;
            itemDiv.addEventListener("click", () => {
                if (window.confirm("要恢复此搜索结果吗？当前会话将被覆盖。")) {
                    currentSearchSession = [
                        { type: 'query', content: item.query },
                        { type: 'result', answer: item.answer, sources: item.sources }
                    ];
                    switchMode("search");
                }
            });
            searchHistoryListDiv.prepend(itemDiv);
        });
    }

    function showLoadingIndicator(text) {
        hideLoadingIndicator();
        const loader = document.createElement("div");
        loader.className = `${SCRIPT_PREFIX}-loader`;
        loader.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div><span>${text}</span>`;
        currentLoadingMessageElement = loader;
        outputDisplayArea.appendChild(loader);
        outputDisplayArea.scrollTop = outputDisplayArea.scrollHeight;
    }

    function hideLoadingIndicator() {
        if (currentLoadingMessageElement) {
            currentLoadingMessageElement.remove();
            currentLoadingMessageElement = null;
        }
    }

    function showUserMessage(message, type = "error") {
        hideLoadingIndicator();
        const feedbackDiv = document.createElement("div");
        feedbackDiv.textContent = message;
        feedbackDiv.className = `${SCRIPT_PREFIX}-user-feedback ${type}`;
        
        const targetArea = (currentMode === 'settings') 
            ? document.querySelector(`.${SCRIPT_PREFIX}-settings-pane.active`) 
            : outputDisplayArea;

        if (targetArea) {
            if (currentMode === 'settings') {
                targetArea.prepend(feedbackDiv);
                setTimeout(() => feedbackDiv.remove(), 5000);
            } else {
                targetArea.appendChild(feedbackDiv);
                targetArea.scrollTop = targetArea.scrollHeight;
            }
        }
    }

    function clearAllHistory() {
        if (window.confirm("您确定要清除所有翻译、对话和搜索历史记录吗？此操作无法撤销。")) {
            translationHistory = [];
            chatHistory = [];
            searchHistory = [];
            storageSet({ translationHistory: [], chatHistory: [], searchHistory: [] }).then(() => {
                renderTranslationHistory();
                renderChatHistory();
                renderSearchHistory();
                showToast("所有历史记录已清除", "success");
            });
        }
    }

    function renderApiResponseContent(content, element) {
        element.innerHTML = "";
        const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
        const thoughts = [];
        let resultText = content.replace(thinkRegex, (match, thought) => {
            thoughts.push(thought.trim());
            return "";
        }).trim();

        thoughts.forEach(thought => {
            const details = document.createElement("details");
            details.className = `${SCRIPT_PREFIX}-think-block`;
            const summary = document.createElement("summary");
            summary.className = `${SCRIPT_PREFIX}-think-summary`;
            summary.innerHTML = `<span class="${SCRIPT_PREFIX}-think-icon">${ICONS.THINK}</span> 思考过程`;
            const pre = document.createElement("pre");
            pre.className = `${SCRIPT_PREFIX}-think-content`;
            pre.textContent = thought;
            details.appendChild(summary);
            details.appendChild(pre);
            element.appendChild(details);
        });

        if (resultText) {
            const resultDiv = document.createElement("div");
            if (thoughts.length > 0) {
                resultDiv.className = `${SCRIPT_PREFIX}-result-content`;
            }
            if (window.marked) {
                resultDiv.innerHTML = window.marked.parse(resultText, { breaks: true });
            } else {
                resultDiv.textContent = resultText;
            }
            element.appendChild(resultDiv);
        }
    }

    function escapeHtml(text) {
        if(typeof text !== 'string') return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function addHistoryItem(historyArray, storageKey, item) {
        if (config.maxHistoryItems <= 0) return;
        historyArray.unshift(item);
        while (historyArray.length > config.maxHistoryItems) {
            historyArray.pop();
        }
        await storageSet({ [storageKey]: historyArray });
        if (storageKey === 'translationHistory') {
            renderTranslationHistory();
        } else if (storageKey === 'chatHistory') {
            renderChatHistory();
        } else if (storageKey === 'searchHistory') {
            renderSearchHistory();
        }
    }
    
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'session' && changes.pendingTranslation) {
            processPendingTranslation();
        }
    });

    document.addEventListener('DOMContentLoaded', initialize);

})();