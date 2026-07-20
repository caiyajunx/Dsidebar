// js/modules/settings.js
(function(window) {
    'use strict';

    window.DS = window.DS || {};

    class SettingsModule {
        constructor() {
            this.callbacks = {};
        }

        init(callbacks) {
            this.callbacks = callbacks || {};
        }

        createPanel() {
            const SCRIPT_PREFIX = DS.SCRIPT_PREFIX;
            const config = DS.config;
            const storageSet = DS.storage.set;
            const showToast = DS.utils.showToast;

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
        
            const headerActions = panel.querySelector('.aiTranslator-settings-header-actions');
            const loadExampleBtn = document.createElement('button');
            loadExampleBtn.id = 'load-example-settings-btn';
            loadExampleBtn.className = `${SCRIPT_PREFIX}-button-control`;
            loadExampleBtn.textContent = '导入示例配置';
            headerActions.prepend(loadExampleBtn);

            const tabsContainer = document.createElement('div');
            tabsContainer.className = `${SCRIPT_PREFIX}-settings-tabs-container`;
            const contentArea = document.createElement('div');
            contentArea.className = `${SCRIPT_PREFIX}-settings-content-area`;
        
            const tabs = {
                'translate': { button: document.createElement('button'), text: '翻译设置', pane: this._createTranslationSettingsPane() },
                'api': { button: document.createElement('button'), text: 'API 设置', pane: this._createApiSettingsPane() },
                'search': { button: document.createElement('button'), text: '搜索设置', pane: this._createSearchSettingsPane() },
                'ui': { button: document.createElement('button'), text: '界面设置', pane: this._createUISettingsPane() }
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
        
            loadExampleBtn.addEventListener('click', () => this._handleLoadExampleSettings());
            panel.querySelector('#import-settings-btn').addEventListener('click', () => this._handleImportSettings());
            panel.querySelector('#export-settings-btn').addEventListener('click', () => this._handleExportSettings());
        
            return panel;
        }

        // --- Sub-Panes ---

        _createTranslationSettingsPane() {
            const config = DS.config;
            const SCRIPT_PREFIX = DS.SCRIPT_PREFIX;
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
                DS.storage.set({ targetLanguage: config.targetLanguage });
                this._updatePromptPreview(promptPreview);
            });
            section.appendChild(this._createFormGroup('目标语言:', targetLangSelect));
            
            const createPromptTextarea = (key) => {
                const textarea = document.createElement('textarea');
                textarea.className = `${SCRIPT_PREFIX}-textarea-control`;
                textarea.rows = 2;
                textarea.value = (config.translationPrompt && config.translationPrompt[key]) || '';
                textarea.addEventListener('change', (e) => {
                    config.translationPrompt[key] = e.target.value.trim();
                    DS.storage.set({ translationPrompt: config.translationPrompt });
                    this._updatePromptPreview(promptPreview);
                });
                return textarea;
            };
            section.appendChild(this._createFormGroup('专业领域:', createPromptTextarea('domain')));
            section.appendChild(this._createFormGroup('目标受众:', createPromptTextarea('audience')));
            section.appendChild(this._createFormGroup('应用场景:', createPromptTextarea('context')));
            section.appendChild(this._createFormGroup('翻译语气:', createPromptTextarea('tone')));
            section.appendChild(promptPreview);
            
            const vocabSection = document.createElement('div');
            vocabSection.className = `${SCRIPT_PREFIX}-settings-section`;
            vocabSection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">专业词汇表</div>`;
            const vocabManager = this._createManagerComponent({
                collection: config.vocabularies,
                activeIdKey: 'activeVocabularyId',
                storageKey: 'vocabularies',
                newItemPrompt: '请输入新的词汇表名称 (如: 英中-医药):',
                newItemDefaults: { content: '# 格式: 英文/原文: 中文/译文\n# 每行一组，用冒号分隔\nLLM: 大语言模型\nPrompt Engineering: 提示工程' },
                onActiveChange: () => this._updatePromptPreview(promptPreview)
            });
            vocabSection.appendChild(vocabManager.container);
            this._updatePromptPreview(promptPreview);
            pane.appendChild(section);
            pane.appendChild(vocabSection);
            return pane;
        }

        _createApiSettingsPane() {
            const config = DS.config;
            const SCRIPT_PREFIX = DS.SCRIPT_PREFIX;
            const pane = document.createElement('div');
            pane.className = `${SCRIPT_PREFIX}-settings-pane`;
            
            const profileManagementSection = document.createElement('div');
            profileManagementSection.className = `${SCRIPT_PREFIX}-settings-section`;
            profileManagementSection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">API 配置方案管理</div>`;
            
            let currentlyEditingProfileId = (config.apiProfiles && Array.isArray(config.apiProfiles) && config.apiProfiles.length > 0) ? config.apiProfiles[0].id : null;
            
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

            const profileUrlWrapper = document.createElement('div');
            profileUrlWrapper.style.display = 'flex';
            profileUrlWrapper.style.gap = '8px';
            profileUrlWrapper.style.alignItems = 'center';
            profileUrlInput.style.flex = '1';

            const authorizeUrlBtn = document.createElement('button');
            authorizeUrlBtn.type = 'button';
            authorizeUrlBtn.className = `${SCRIPT_PREFIX}-button-control`;
            authorizeUrlBtn.textContent = '授权当前地址';
            authorizeUrlBtn.title = '授权此 API 域名，供扩展发起请求';
            profileUrlWrapper.appendChild(profileUrlInput);
            profileUrlWrapper.appendChild(authorizeUrlBtn);
            
            // --- API Key + Eye Toggle ---
            const keyWrapper = document.createElement('div');
            keyWrapper.style.display = 'flex';
            keyWrapper.style.gap = '8px';
            keyWrapper.style.alignItems = 'center';
    
            const profileKeyInput = document.createElement('input');
            profileKeyInput.type = 'password';
            profileKeyInput.style.flex = '1';
            profileKeyInput.style.marginBottom = '0';
            
            const toggleKeyBtn = document.createElement('button');
            toggleKeyBtn.className = `${SCRIPT_PREFIX}-button-control`;
            toggleKeyBtn.title = "显示/隐藏 API Key";
            toggleKeyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`; 
            toggleKeyBtn.style.padding = '8px';
            toggleKeyBtn.style.display = 'flex';
            toggleKeyBtn.style.alignItems = 'center';
    
            toggleKeyBtn.addEventListener('click', () => {
                if (profileKeyInput.type === 'password') {
                    profileKeyInput.type = 'text';
                    toggleKeyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
                } else {
                    profileKeyInput.type = 'password';
                    toggleKeyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
                }
            });
    
            keyWrapper.appendChild(profileKeyInput);
            keyWrapper.appendChild(toggleKeyBtn);
    
            const profileModelInput = document.createElement('input');
            const profileProviderSelect = document.createElement('select');
            profileProviderSelect.className = `${SCRIPT_PREFIX}-select-control`;
            ['openai', 'gemini'].forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p === 'openai' ? 'OpenAI-Compatible' : 'Google Gemini';
                profileProviderSelect.appendChild(opt);
            });

            let updateHostPermissionState = () => {};
    
            const updateDetailsDisplay = () => {
                const profile = (config.apiProfiles && Array.isArray(config.apiProfiles)) 
                    ? config.apiProfiles.find(p => p.id === currentlyEditingProfileId) 
                    : null;
                if(profile) {
                    profileNameInput.value = profile.name || '';
                    profileProviderSelect.value = profile.provider || 'openai';
                    profileUrlInput.value = profile.url || '';
                    profileKeyInput.value = profile.key || '';
                    profileModelInput.value = profile.model || '';
                } else {
                    profileNameInput.value = '';
                    profileProviderSelect.value = 'openai';
                    profileUrlInput.value = '';
                    profileKeyInput.value = '';
                    profileModelInput.value = '';
                }
                updateHostPermissionState();
            };
    
            const populateProfileSelect = () => {
                const currentVal = select.value;
                select.innerHTML = '';
                if (config.apiProfiles && Array.isArray(config.apiProfiles)) {
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
                } else {
                    currentlyEditingProfileId = null;
                }
                updateDetailsDisplay();
            };
    
            const saveCurrentProfile = async () => {
                if (!currentlyEditingProfileId) return;
                const profile = (config.apiProfiles && Array.isArray(config.apiProfiles)) 
                    ? config.apiProfiles.find(p => p.id === currentlyEditingProfileId) 
                    : null;
                if (profile) {
                    profile.name = profileNameInput.value.trim();
                    profile.url = profileUrlInput.value.trim();
                    profile.key = profileKeyInput.value.trim();
                    profile.model = profileModelInput.value.trim();
                    profile.provider = profileProviderSelect.value;
                    await DS.storage.set({ apiProfiles: config.apiProfiles });
                    select.options[select.selectedIndex].text = profile.name;
                    if(this.callbacks.onProfileChange) this.callbacks.onProfileChange();
                }
            };
            
            [profileNameInput, profileUrlInput, profileKeyInput, profileModelInput, profileProviderSelect].forEach(input => {
                input.className = `${SCRIPT_PREFIX}-input-control`;
                input.addEventListener('change', saveCurrentProfile);
            });

            updateHostPermissionState = async () => {
                const url = profileUrlInput.value.trim();
                authorizeUrlBtn.disabled = !url;
                if (!url) {
                    authorizeUrlBtn.textContent = '授权当前地址';
                    return;
                }

                try {
                    const granted = await DS.ApiService.hasHostPermission(url);
                    if (profileUrlInput.value.trim() !== url) return;
                    authorizeUrlBtn.textContent = granted ? '地址已授权' : '授权当前地址';
                    authorizeUrlBtn.title = granted ? '此 API 域名已获授权' : '授权此 API 域名，供扩展发起请求';
                } catch (error) {
                    if (profileUrlInput.value.trim() !== url) return;
                    authorizeUrlBtn.textContent = '地址无效';
                    authorizeUrlBtn.title = error.message;
                }
            };

            profileUrlInput.addEventListener('input', updateHostPermissionState);
            authorizeUrlBtn.addEventListener('click', async () => {
                const url = profileUrlInput.value.trim();
                if (!url) {
                    DS.utils.showToast('请先填写 API 地址。', 'error');
                    return;
                }

                try {
                    const granted = await DS.ApiService.requestHostPermission(url);
                    if (!granted) {
                        DS.utils.showToast('未授予该 API 地址的访问权限。', 'error');
                        return;
                    }
                    await saveCurrentProfile();
                    await updateHostPermissionState();
                    DS.utils.showToast('API 地址已授权。', 'success');
                } catch (error) {
                    DS.utils.showToast(`授权失败：${error.message}`, 'error');
                }
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
                    await DS.storage.set({ apiProfiles: config.apiProfiles });
                    populateProfileSelect();
                }
            });
    
            deleteBtn.addEventListener('click', async () => {
                 if (config.apiProfiles.length <= 1) {
                    DS.utils.showToast('无法删除最后一个API配置方案。', 'error');
                    return;
                }
                if (!(await DS.utils.confirm(`确定要删除 "${select.options[select.selectedIndex].text}" 吗？`))) return;
                const deletedId = currentlyEditingProfileId;
                config.apiProfiles = config.apiProfiles.filter(p => p.id !== deletedId);
                const fallbackId = config.apiProfiles[0]?.id || null;
                
                ['activeTranslateProfileId', 'activeChatProfileId', 'activeSearchProfileId'].forEach(key => {
                    if(config[key] === deletedId) {
                        config[key] = fallbackId;
                    }
                });

                await DS.storage.set({ 
                    apiProfiles: config.apiProfiles,
                    activeTranslateProfileId: config.activeTranslateProfileId,
                    activeChatProfileId: config.activeChatProfileId,
                    activeSearchProfileId: config.activeSearchProfileId,
                });
                populateProfileSelect();
            });
            
            profileDetailsContainer.appendChild(this._createFormGroup('配置方案名称:', profileNameInput));
            profileDetailsContainer.appendChild(this._createFormGroup('服务商 (Provider):', profileProviderSelect));
            profileDetailsContainer.appendChild(this._createFormGroup('模型名称 (Model Name):', profileModelInput));
            profileDetailsContainer.appendChild(this._createFormGroup('请求地址 (API URL):', profileUrlWrapper));
            profileDetailsContainer.appendChild(this._createFormGroup('API Key:', keyWrapper));
            
            profileManagementSection.appendChild(manager);
            profileManagementSection.appendChild(profileDetailsContainer);
            
            pane.appendChild(profileManagementSection);
            
            // --- 推荐链接 ---
            const recommendationSection = document.createElement('div');
            recommendationSection.className = `${SCRIPT_PREFIX}-settings-section`;
            recommendationSection.style.marginTop = '24px';
            recommendationSection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">推荐 API 服务 (注册领额度)</div>`;
    
            const linksContainer = document.createElement('div');
            linksContainer.style.display = 'flex';
            linksContainer.style.flexDirection = 'column';
            linksContainer.style.gap = '12px';
    
            const recommendedLinks = [
                { name: '硅基流动', url: 'https://siliconflow.cn/', desc: '硅基流动（SiliconFlow）模型 API 平台' },
                { name: '智谱', url: 'https://www.bigmodel.cn/', desc: '智谱 AI 模型服务平台' },
                { name: 'OpenAI API', url: 'https://platform.openai.com/', desc: 'OpenAI API 平台' }
            ];
    
            recommendedLinks.forEach(link => {
                const item = document.createElement('div');
                item.style.padding = '10px';
                item.style.backgroundColor = 'var(--bg-secondary)';
                item.style.borderRadius = 'var(--border-radius-md)';
                item.style.border = '1px solid var(--border-color-dark)';
                
                const linkEl = document.createElement('a');
                linkEl.href = link.url;
                linkEl.target = '_blank';
                linkEl.textContent = link.name;
                linkEl.style.fontWeight = '600';
                linkEl.style.color = 'var(--accent-primary)';
                linkEl.style.textDecoration = 'none';
                linkEl.style.display = 'block';
                linkEl.style.marginBottom = '4px';
                
                const descEl = document.createElement('div');
                descEl.textContent = link.desc;
                descEl.style.fontSize = '12px';
                descEl.style.color = 'var(--text-secondary)';
                
                item.appendChild(linkEl);
                item.appendChild(descEl);
                linksContainer.appendChild(item);
            });
    
            recommendationSection.appendChild(linksContainer);
            pane.appendChild(recommendationSection);
            
            populateProfileSelect();
            
            return pane;
        }

        _createSearchSettingsPane() {
            const config = DS.config;
            const SCRIPT_PREFIX = DS.SCRIPT_PREFIX;
            const pane = document.createElement('div');
            pane.className = `${SCRIPT_PREFIX}-settings-pane`;
            config.searchSettings = config.searchSettings || {};
            config.searchSettings.dataSources = config.searchSettings.dataSources || {};
            config.searchSettings.dataSources.openFda = {
                enabled: true,
                accessKey: '',
                ...(config.searchSettings.dataSources.openFda || {})
            };
            config.searchSettings.dataSources.clinicalTrials = {
                enabled: true,
                ...(config.searchSettings.dataSources.clinicalTrials || {})
            };
            
            const save = () => DS.storage.set({ searchSettings: config.searchSettings });

            const publicDataSection = document.createElement('div');
            publicDataSection.className = `${SCRIPT_PREFIX}-settings-section`;
            publicDataSection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">药物研发公开数据源</div>`;

            const publicDataInfo = document.createElement('div');
            publicDataInfo.className = `${SCRIPT_PREFIX}-prompt-preview`;
            publicDataInfo.textContent = 'OpenFDA 和 ClinicalTrials.gov 可在未配置 Tavily 时提供药物标签与试验登记检索。OpenFDA 默认不需要 Key；填写可选 access key 仅用于提高公开 API 限额。试验登记与自发不良事件不能直接推断疗效、发生率或因果关系。';
            publicDataSection.appendChild(publicDataInfo);

            const openFdaToggle = document.createElement('input');
            openFdaToggle.type = 'checkbox';
            openFdaToggle.checked = config.searchSettings.dataSources.openFda.enabled !== false;
            openFdaToggle.addEventListener('change', event => {
                config.searchSettings.dataSources.openFda.enabled = event.target.checked;
                save();
            });
            publicDataSection.appendChild(this._createFormGroup('启用 OpenFDA（药品标签/批准等）:', openFdaToggle));

            const openFdaKey = document.createElement('input');
            openFdaKey.type = 'password';
            openFdaKey.className = `${SCRIPT_PREFIX}-input-control`;
            openFdaKey.value = config.searchSettings.dataSources.openFda.accessKey || '';
            openFdaKey.placeholder = '可选：OpenFDA access key（默认留空）';
            openFdaKey.addEventListener('change', event => {
                config.searchSettings.dataSources.openFda.accessKey = event.target.value.trim();
                save();
            });
            publicDataSection.appendChild(this._createFormGroup('OpenFDA access key（可选）:', openFdaKey));

            const clinicalTrialsToggle = document.createElement('input');
            clinicalTrialsToggle.type = 'checkbox';
            clinicalTrialsToggle.checked = config.searchSettings.dataSources.clinicalTrials.enabled !== false;
            clinicalTrialsToggle.addEventListener('change', event => {
                config.searchSettings.dataSources.clinicalTrials.enabled = event.target.checked;
                save();
            });
            publicDataSection.appendChild(this._createFormGroup('启用 ClinicalTrials.gov（试验登记）:', clinicalTrialsToggle));
            pane.appendChild(publicDataSection);
    
            const tavilySection = document.createElement('div');
            tavilySection.className = `${SCRIPT_PREFIX}-settings-section`;
            
            const tavilyHeaderDiv = document.createElement('div');
            tavilyHeaderDiv.className = `${SCRIPT_PREFIX}-settings-section-header`;
            tavilyHeaderDiv.style.display = 'flex';
            tavilyHeaderDiv.style.alignItems = 'center';
            tavilyHeaderDiv.style.justifyContent = 'space-between';
            
            const tavilyHeaderTitle = document.createElement('span');
            tavilyHeaderTitle.textContent = 'Tavily API 设置';
            
            const registerLink = document.createElement('a');
            registerLink.href = 'https://tavily.com/';
            registerLink.target = '_blank';
            registerLink.textContent = '注册 Tavily';
            registerLink.style.fontSize = '13px';
            registerLink.style.color = 'var(--accent-primary)';
            registerLink.style.textDecoration = 'none';
            registerLink.style.fontWeight = '500';
            
            tavilyHeaderDiv.appendChild(tavilyHeaderTitle);
            tavilyHeaderDiv.appendChild(registerLink);
            tavilySection.appendChild(tavilyHeaderDiv);
            
            const tavilyInfoDiv = document.createElement('div');
            tavilyInfoDiv.style.padding = '10px';
            tavilyInfoDiv.style.marginBottom = '12px';
            tavilyInfoDiv.style.backgroundColor = 'var(--bg-secondary)';
            tavilyInfoDiv.style.borderRadius = 'var(--border-radius-sm)';
            tavilyInfoDiv.style.fontSize = '13px';
            tavilyInfoDiv.style.lineHeight = '1.6';
            tavilyInfoDiv.style.color = 'var(--text-secondary)';
            tavilyInfoDiv.innerHTML = '🎺 登录Tavily注册账号，获取每月免费1000信用点，基本搜索（Basic）每次消耗 1 点，高级搜索（Advanced）每次消耗 2 点。基本内容提取，每5次成功消耗 1 点';
            tavilySection.appendChild(tavilyInfoDiv);
            
            const keysContainer = document.createElement('div');
            keysContainer.id = 'tavily-keys-container';
            
            const renderTavilyKeys = () => {
                keysContainer.innerHTML = '';
                if (config.searchSettings && config.searchSettings.tavilyKeys && Array.isArray(config.searchSettings.tavilyKeys)) {
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
            };
            
            const addKeyBtn = document.createElement('button');
            addKeyBtn.textContent = '添加 Key';
            addKeyBtn.className = `${SCRIPT_PREFIX}-button-control`;
            addKeyBtn.style.marginTop = '8px';
            addKeyBtn.onclick = () => {
                config.searchSettings.tavilyKeys.push('');
                save().then(renderTavilyKeys);
            };
            tavilySection.appendChild(this._createFormGroup('API Keys (支持多个轮询):', keysContainer));
            tavilySection.appendChild(addKeyBtn);
            
            pane.appendChild(tavilySection);
            
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
            roleSection.appendChild(this._createFormGroup('搜索角色 (贯穿整个搜索流程):', roleTextarea));
    
            pane.appendChild(roleSection);

            const professionalSection = document.createElement('div');
            professionalSection.className = `${SCRIPT_PREFIX}-settings-section`;
            professionalSection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">专业搜索回答设置</div>`;

            const instructionTextarea = document.createElement('textarea');
            instructionTextarea.className = `${SCRIPT_PREFIX}-textarea-control`;
            instructionTextarea.rows = 4;
            instructionTextarea.value = config.searchSettings.deepSearchInstruction || '';
            instructionTextarea.addEventListener('change', e => {
                config.searchSettings.deepSearchInstruction = e.target.value.trim();
                save();
            });
            professionalSection.appendChild(this._createFormGroup('行业框定 Prompt:', instructionTextarea));

            const priorityTextarea = document.createElement('textarea');
            priorityTextarea.className = `${SCRIPT_PREFIX}-textarea-control`;
            priorityTextarea.rows = 4;
            priorityTextarea.value = config.searchSettings.sourcePriorityRules || '';
            priorityTextarea.addEventListener('change', e => {
                config.searchSettings.sourcePriorityRules = e.target.value.trim();
                save();
            });
            professionalSection.appendChild(this._createFormGroup('来源优先级规则:', priorityTextarea));

            const templateTextarea = document.createElement('textarea');
            templateTextarea.className = `${SCRIPT_PREFIX}-textarea-control`;
            templateTextarea.rows = 3;
            templateTextarea.value = config.searchSettings.defaultAnswerTemplate || '';
            templateTextarea.addEventListener('change', e => {
                config.searchSettings.defaultAnswerTemplate = e.target.value.trim();
                save();
            });
            professionalSection.appendChild(this._createFormGroup('默认回答结构:', templateTextarea));

            pane.appendChild(professionalSection);
    
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
                profileSection.appendChild(this._createFormGroup('名称:', nameInput));
                
                const descTextarea = document.createElement('textarea');
                descTextarea.className = `${SCRIPT_PREFIX}-textarea-control`;
                descTextarea.rows = 2;
                descTextarea.value = profile.description;
                descTextarea.placeholder = '例如：搜索关于...的最新法规和指南。';
                descTextarea.addEventListener('change', e => {
                    profile.description = e.target.value.trim();
                    save();
                });
                profileSection.appendChild(this._createFormGroup('搜索说明 (将用于生成关键词和执行检索):', descTextarea));
    
                const domainsTextarea = document.createElement('textarea');
                domainsTextarea.className = `${SCRIPT_PREFIX}-textarea-control`;
                domainsTextarea.rows = 4;
                domainsTextarea.value = profile.domains;
                domainsTextarea.placeholder = '每行一个域名, e.g., www.fda.gov/';
                domainsTextarea.addEventListener('change', e => {
                    profile.domains = e.target.value;
                    save();
                });
                profileSection.appendChild(this._createFormGroup('指定域名 (Domains):', domainsTextarea));
    
                pane.appendChild(profileSection);
            });
    
            renderTavilyKeys();
            return pane;
        }

        _createUISettingsPane() {
            const config = DS.config;
            const SCRIPT_PREFIX = DS.SCRIPT_PREFIX;
            const pane = document.createElement('div');
            pane.className = `${SCRIPT_PREFIX}-settings-pane`;
    
            const menuSection = document.createElement('div');
            menuSection.className = `${SCRIPT_PREFIX}-settings-section`;
            menuSection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">菜单项显示</div>`;
    
            // Needs access to full modes list or just keys? 
            // In original sidebar.js, `getFullModes` was used.
            // Here we can just iterate config.menuVisibility keys or hardcode known ones.
            // Let's use the hardcoded list from original code to map text
            const modeMap = {
                'aily': 'Aily', 'ima': 'IMA', 'wenda': '问答', 'kimi': 'KIMI', 'doubao': '豆包', 'prompts': '咒语'
            };
            const configurableModes = ['aily', 'ima', 'wenda', 'kimi', 'doubao','prompts'];
            
            configurableModes.forEach(modeId => {
                const group = document.createElement('div');
                group.className = `${SCRIPT_PREFIX}-form-group`;
                const label = document.createElement('label');
                label.className = `${SCRIPT_PREFIX}-label`;
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.cursor = 'pointer';
    
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.style.marginRight = '8px';
                checkbox.checked = config.menuVisibility[modeId];
                
                checkbox.addEventListener('change', async (e) => {
                    const isChecked = e.target.checked;
                    config.menuVisibility[modeId] = isChecked;
                    await DS.storage.set({ menuVisibility: config.menuVisibility });
                    
                    if (!isChecked && DS.currentMode === modeId) {
                        if(this.callbacks.onSwitchMode) this.callbacks.onSwitchMode('translate');
                    }
                    if(this.callbacks.onNavUpdate) this.callbacks.onNavUpdate();
                    DS.utils.showToast(`“${modeMap[modeId]}”菜单已${isChecked ? '显示' : '隐藏'}`, 'success');
                });
                
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(modeMap[modeId]));
                group.appendChild(label);
                menuSection.appendChild(group);
            });
            pane.appendChild(menuSection);
    
            const toolSection = document.createElement('div');
            toolSection.className = `${SCRIPT_PREFIX}-settings-section`;
            toolSection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">自定义工具栏 (Custom Tools)</div>`;
            
            const toolsContainer = document.createElement('div');
            toolsContainer.id = 'custom-tools-list';
            
            const renderTools = () => {
                toolsContainer.innerHTML = '';
                if (config.customTools && Array.isArray(config.customTools)) {
                    config.customTools.forEach((tool, index) => {
                    const row = document.createElement('div');
                    row.className = `${SCRIPT_PREFIX}-form-group custom-tool-row`;
                    row.style.display = 'flex';
                    row.style.gap = '8px';
                    row.style.marginBottom = '8px';
    
                    const nameInput = document.createElement('input');
                    nameInput.className = `${SCRIPT_PREFIX}-input-control`;
                    nameInput.value = tool.name;
                    nameInput.placeholder = '名称 (如: 问答)';
                    nameInput.style.flex = '0 0 30%';
                    nameInput.addEventListener('change', async (e) => {
                        tool.name = e.target.value.trim();
                        await DS.storage.set({ customTools: config.customTools });
                        if(this.callbacks.onNavUpdate) this.callbacks.onNavUpdate();
                    });
    
                    const urlInput = document.createElement('input');
                    urlInput.className = `${SCRIPT_PREFIX}-input-control`;
                    urlInput.value = tool.url;
                    urlInput.placeholder = 'URL (如: https://ask.feishu.cn/)';
                    urlInput.style.flex = '1';
                    urlInput.addEventListener('change', async (e) => {
                        tool.url = e.target.value.trim();
                        await DS.storage.set({ customTools: config.customTools });
                        if(this.callbacks.onNavUpdate) this.callbacks.onNavUpdate();
                    });
    
                    const delBtn = document.createElement('button');
                    delBtn.textContent = '删除';
                    delBtn.className = `${SCRIPT_PREFIX}-button-control danger`;
                    delBtn.style.padding = '0 12px';
                    delBtn.onclick = async () => {
                        if (!(await DS.utils.confirm(`确定删除 "${tool.name}" 吗?`))) return;
                        config.customTools.splice(index, 1);
                        await DS.storage.set({ customTools: config.customTools });
                        if(this.callbacks.onNavUpdate) this.callbacks.onNavUpdate();
                        renderTools();
                        if (DS.currentMode === `custom_${tool.id}`) {
                            if(this.callbacks.onSwitchMode) this.callbacks.onSwitchMode('translate');
                        }
                    };
    
                    row.appendChild(nameInput);
                    row.appendChild(urlInput);
                    row.appendChild(delBtn);
                    toolsContainer.appendChild(row);
                });
                }
            };
    
            const addBtn = document.createElement('button');
            addBtn.textContent = '+ 添加新工具';
            addBtn.className = `${SCRIPT_PREFIX}-button-control`;
            addBtn.style.marginTop = '8px';
            addBtn.onclick = async () => {
                const newTool = {
                    id: Date.now().toString(),
                    name: '新工具',
                    url: ''
                };
                config.customTools.push(newTool);
                await DS.storage.set({ customTools: config.customTools });
                renderTools();
                if(this.callbacks.onNavUpdate) this.callbacks.onNavUpdate();
            };
    
            renderTools(); 
            toolSection.appendChild(toolsContainer);
            toolSection.appendChild(addBtn);
            pane.appendChild(toolSection);
            
            // 翻译按钮设置
            const translateBtnSection = document.createElement('div');
            translateBtnSection.className = `${SCRIPT_PREFIX}-settings-section`;
            translateBtnSection.innerHTML = `<div class="${SCRIPT_PREFIX}-settings-section-header">翻译按钮设置</div>`;

            const enableFloatingGroup = document.createElement('div');
            enableFloatingGroup.className = `${SCRIPT_PREFIX}-form-group`;
            const enableFloatingLabel = document.createElement('label');
            enableFloatingLabel.className = `${SCRIPT_PREFIX}-label`;
            enableFloatingLabel.style.display = 'flex';
            enableFloatingLabel.style.alignItems = 'center';
            enableFloatingLabel.style.cursor = 'pointer';

            const enableFloatingCheckbox = document.createElement('input');
            enableFloatingCheckbox.type = 'checkbox';
            enableFloatingCheckbox.style.marginRight = '8px';
            enableFloatingCheckbox.checked = !!config.enableFloatingTranslateButton;
            enableFloatingCheckbox.addEventListener('change', async (e) => {
                const checked = !!e.target.checked;
                config.enableFloatingTranslateButton = checked;
                await DS.storage.set({ enableFloatingTranslateButton: checked });
                DS.utils.showToast(`划词浮动翻译按钮已${checked ? '开启' : '关闭'}`, 'success');
            });

            enableFloatingLabel.appendChild(enableFloatingCheckbox);
            enableFloatingLabel.appendChild(document.createTextNode('启用划词浮动翻译按钮（选中文本后显示“AI 翻译”按钮）'));
            enableFloatingGroup.appendChild(enableFloatingLabel);
            translateBtnSection.appendChild(enableFloatingGroup);
            
            const hideDomainsTextarea = document.createElement('textarea');
            hideDomainsTextarea.className = `${SCRIPT_PREFIX}-textarea-control`;
            hideDomainsTextarea.rows = 4;
            hideDomainsTextarea.value = config.hideTranslateBtnDomains || '';
            hideDomainsTextarea.placeholder = '输入域名，用逗号或换行分隔\n\n例如：\nfeishu.cn\nfeishu.com\nnotion.so';
            hideDomainsTextarea.style.fontSize = '13px';
            hideDomainsTextarea.style.lineHeight = '1.6';
            
            hideDomainsTextarea.addEventListener('change', (e) => {
                config.hideTranslateBtnDomains = e.target.value.trim();
                DS.storage.set({ hideTranslateBtnDomains: config.hideTranslateBtnDomains });
            });
            
            translateBtnSection.appendChild(this._createFormGroup(
                '不显示浮动翻译按钮的域名列表',
                hideDomainsTextarea
            ));
            pane.appendChild(translateBtnSection);
    
            return pane;
        }

        // --- Helpers ---

        _createManagerComponent({ collection, activeIdKey, storageKey, newItemPrompt, newItemDefaults, onActiveChange }) {
            const config = DS.config;
            const SCRIPT_PREFIX = DS.SCRIPT_PREFIX;
            if (!collection || !Array.isArray(collection)) {
                collection = [];
            }
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
                if (collection && Array.isArray(collection)) {
                    collection.forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item.id;
                        opt.textContent = item.name;
                        if (item.id === config[activeIdKey]) opt.selected = true;
                        select.appendChild(opt);
                    });
                }
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
                await DS.storage.set({ [activeIdKey]: config[activeIdKey] });
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
                    await DS.storage.set({ [storageKey]: collection, [activeIdKey]: newItem.id });
                    populateSelect();
                    if (onActiveChange) onActiveChange();
                }
            });
            deleteBtn.addEventListener('click', async () => {
                if (collection.length === 0) return;
                if (collection.length === 1 && storageKey === 'apiProfiles') {
                    DS.utils.showToast('无法删除最后一个API配置方案。', 'error');
                    return;
                }
                if (!(await DS.utils.confirm(`确定要删除 "${select.options[select.selectedIndex].text}" 吗？`))) return;
                const deletedId = config[activeIdKey];
                config[storageKey] = collection.filter(p => p.id !== deletedId);
                config[activeIdKey] = config[storageKey][0]?.id || null;
                await DS.storage.set({ [storageKey]: config[storageKey], [activeIdKey]: config[activeIdKey] });
                populateSelect();
                if (onActiveChange) onActiveChange();
            });
            if (contentTextarea) {
                contentTextarea.addEventListener('change', async () => {
                    const item = collection.find(p => p.id === config[activeIdKey]);
                    if (item) {
                        item.content = contentTextarea.value;
                        await DS.storage.set({ [storageKey]: collection });
                    }
                });
            }
            container.appendChild(manager);
            if (contentTextarea) container.appendChild(contentTextarea);
            populateSelect();
            return { container, updateDetails: (callback) => { detailUpdateCallback = callback; updateDetails(); } };
        }

        _updatePromptPreview(element) {
            if (!element) return;
            const config = DS.config;
            const p = config.translationPrompt || {};
            const activeVocab = (config.vocabularies && Array.isArray(config.vocabularies)) 
                ? config.vocabularies.find(v => v.id === config.activeVocabularyId) 
                : null;
            const vocabName = activeVocab ? activeVocab.name : '无';
            const previewText = `作为一名专业的 [<strong>${p.domain || '...'}</strong>] 翻译，请将以下文本翻译成 [<strong>${config.targetLanguage || '...'}</strong>]。目标读者是 [<strong>${p.audience || '...'}</strong>]，应用场景为 [<strong>${p.context || '...'}</strong>]，请保持 [<strong>${p.tone || '...'}</strong>] 的风格。\n\n当前选用词汇表: [<strong>${vocabName}</strong>]`;
            element.innerHTML = previewText.replace(/\n/g, '<br>');
        }

        _createFormGroup(label, control) {
            const group = document.createElement('div');
            group.className = `${DS.SCRIPT_PREFIX}-form-group`;
            const labelEl = document.createElement('label');
            labelEl.className = `${DS.SCRIPT_PREFIX}-label`;
            labelEl.textContent = label;
            group.appendChild(labelEl);
            group.appendChild(control);
            return group;
        }

        _handleExportSettings() {
            // Implementation...
            const keysToExport = [
                'schemaVersion', 'setupCompleted',
                'apiProfiles', 'activeTranslateProfileId', 'activeChatProfileId', 'activeSearchProfileId',
                'vocabularies', 'activeVocabularyId',
                'translationPrompt', 'targetLanguage', 'maxHistoryItems', 'uiMode', 'searchSettings',
                'menuVisibility', 'customTools'
            ];
            DS.storage.get(keysToExport).then(settings => {
                const exportData = {
                    ...settings,
                    schemaVersion: '2.0',
                    exportedAt: new Date().toISOString()
                };
                const dataStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const date = new Date().toISOString().slice(0, 10);
                a.download = `dsider_private_settings_${date}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                DS.utils.showToast('设置已导出', 'success');
            }).catch(e => {
                DS.utils.showToast('导出失败: ' + e.message, 'error');
            });
        }

        async _handleLoadExampleSettings() {
            const example = DS.EXAMPLE_CONFIG;
            if (!example) {
                DS.utils.showToast('示例配置未加载。', 'error');
                return;
            }

            if (!(await DS.utils.confirm('将添加内置示例 API 和示例搜索画像。不会写入任何 API Key，也不会覆盖您已有的 Key。是否继续？'))) {
                return;
            }

            const config = DS.config;
            const timestamp = Date.now();
            config.apiProfiles = Array.isArray(config.apiProfiles) ? config.apiProfiles : [];

            const hasSameProfile = (profile) => config.apiProfiles.some(item =>
                item.name === profile.name || (
                    item.provider === profile.provider &&
                    item.url === profile.url &&
                    item.model === profile.model
                )
            );

            let addedProfileCount = 0;
            (example.apiProfiles || []).forEach((profile, index) => {
                if (hasSameProfile(profile)) return;
                config.apiProfiles.push({
                    ...profile,
                    id: `example_profile_${timestamp}_${index}`,
                    key: ''
                });
                addedProfileCount += 1;
            });

            if (!config.activeTranslateProfileId && config.apiProfiles[0]) {
                config.activeTranslateProfileId = config.apiProfiles[0].id;
            }
            if (!config.activeChatProfileId && config.apiProfiles[0]) {
                config.activeChatProfileId = config.apiProfiles[0].id;
            }
            if (!config.activeSearchProfileId && config.apiProfiles[0]) {
                config.activeSearchProfileId = config.apiProfiles[0].id;
            }

            const currentSearch = config.searchSettings || {};
            const exampleSearch = example.searchSettings || {};
            const defaultSearch = (DS.DEFAULT_CONFIG && DS.DEFAULT_CONFIG.searchSettings) || {};

            const shouldUseExampleText = (key) => {
                const currentValue = (currentSearch[key] || '').trim();
                const defaultValue = (defaultSearch[key] || '').trim();
                return !currentValue || currentValue === defaultValue;
            };
            const isSameConfigObject = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);

            ['searchRole', 'deepSearchInstruction', 'sourcePriorityRules', 'defaultAnswerTemplate'].forEach(key => {
                if (exampleSearch[key] && shouldUseExampleText(key)) {
                    currentSearch[key] = exampleSearch[key];
                }
            });
            if (
                exampleSearch.sourcePriorityDomains &&
                (!currentSearch.sourcePriorityDomains || isSameConfigObject(currentSearch.sourcePriorityDomains, defaultSearch.sourcePriorityDomains))
            ) {
                currentSearch.sourcePriorityDomains = exampleSearch.sourcePriorityDomains;
            }

            currentSearch.tavilyKeys = Array.isArray(currentSearch.tavilyKeys) && currentSearch.tavilyKeys.length > 0
                ? currentSearch.tavilyKeys
                : [''];
            currentSearch.searchMode = currentSearch.searchMode || exampleSearch.searchMode || 'fast';
            currentSearch.customSearchProfiles = Array.isArray(currentSearch.customSearchProfiles)
                ? currentSearch.customSearchProfiles
                : [];

            let addedSearchProfileCount = 0;
            (exampleSearch.customSearchProfiles || []).forEach(profile => {
                const exists = currentSearch.customSearchProfiles.some(item => item.name === profile.name);
                if (exists) return;
                currentSearch.customSearchProfiles.push({ ...profile });
                addedSearchProfileCount += 1;
            });

            config.searchSettings = currentSearch;

            await DS.storage.set({
                apiProfiles: config.apiProfiles,
                activeTranslateProfileId: config.activeTranslateProfileId,
                activeChatProfileId: config.activeChatProfileId,
                activeSearchProfileId: config.activeSearchProfileId,
                searchSettings: config.searchSettings
            });

            if (this.callbacks.onProfileChange) this.callbacks.onProfileChange();
            DS.utils.showToast(`示例配置已导入：新增 ${addedProfileCount} 个 API 示例，${addedSearchProfileCount} 个搜索画像。`, 'success');
            setTimeout(() => location.reload(), 800);
        }

        _handleImportSettings() {
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
        
                        if (typeof importedData !== 'object' || importedData === null || !Array.isArray(importedData.apiProfiles)) {
                            throw new Error('文件格式不正确或缺少必要数据。');
                        }

                        const isValidProfile = importedData.apiProfiles.every(profile =>
                            profile && typeof profile === 'object' &&
                            typeof profile.url === 'string' &&
                            typeof profile.key === 'string' &&
                            typeof profile.model === 'string'
                        );
                        if (!isValidProfile) {
                            throw new Error('API 配置格式无效：每个配置必须包含字符串类型的 URL、Key 和模型名称。');
                        }

                        importedData.schemaVersion = importedData.schemaVersion || '2.0';
                        importedData.setupCompleted = importedData.apiProfiles.some(profile =>
                            profile.url.trim() && profile.key.trim() && profile.model.trim()
                        );
        
                        if (await DS.utils.confirm('这将覆盖您所有的当前设置（包括 API 密钥和界面设置）。导入文件仅应来自您信任的来源。您确定要继续吗？')) {
                            await DS.storage.set(importedData);
                            DS.utils.showToast('设置导入成功！应用即将刷新...', 'success');
                            setTimeout(() => location.reload(), 1500);
                        }
                    } catch (err) {
                        DS.utils.showToast('导入失败: ' + err.message, 'error');
                        console.error("Error importing settings:", err);
                    }
                };
                reader.readAsText(file, 'UTF-8');
            };
            input.click();
        }
    }

    DS.SettingsModule = new SettingsModule();

})(window);
