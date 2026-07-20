// js/modules/search.js
(function(window) {
    'use strict';

    window.DS = window.DS || {};

    class SearchModule {
        constructor() {
            this.session = [];
            this.history = [];
            this.isLoading = false;
            this.lastConfig = null;
        }

        init(historyData) {
            this.history = historyData || [];
        }

        clearSession() {
            this.session = [];
            this.render();
        }

        restoreSession(sessionData) {
            this.session = JSON.parse(JSON.stringify(sessionData || []));
            this.render();
        }

        render() {
            const displayArea = document.getElementById(`${DS.SCRIPT_PREFIX}-search-output`);
            if (!displayArea) return;

            const config = window.DS.config || this.lastConfig || {};
            displayArea.innerHTML = '';

            if (!this.session || this.session.length === 0) {
                displayArea.appendChild(this._createEmptyState(config));
                return;
            }

            const thread = document.createElement('div');
            thread.className = `${DS.SCRIPT_PREFIX}-search-thread`;

            this.session.forEach(item => {
                thread.appendChild(this._createSessionNode(item));
            });

            displayArea.appendChild(thread);
            displayArea.appendChild(this._createSearchFooter(config));
            displayArea.scrollTop = displayArea.scrollHeight;
        }

        _createSessionNode(item) {
            const card = document.createElement('div');
            card.className = `${DS.SCRIPT_PREFIX}-search-card`;

            if (item.type === 'query') {
                card.classList.add(`${DS.SCRIPT_PREFIX}-search-query-card`);

                const label = document.createElement('div');
                label.className = `${DS.SCRIPT_PREFIX}-search-card-label`;
                label.textContent = '搜索问题';
                card.appendChild(label);

                const title = document.createElement('h2');
                title.className = `${DS.SCRIPT_PREFIX}-search-query-title`;
                title.textContent = item.content || '';
                card.appendChild(title);
                return card;
            }

            if (item.type === 'status') {
                card.classList.add(`${DS.SCRIPT_PREFIX}-search-status-card`);
                card.appendChild(this._createSearchProgress(item.logs || [], this.isLoading));
                return card;
            }

            if (item.type === 'result') {
                card.classList.add(`${DS.SCRIPT_PREFIX}-search-result-card`);

                const header = document.createElement('div');
                header.className = `${DS.SCRIPT_PREFIX}-search-result-header`;

                const badge = document.createElement('div');
                badge.className = `${DS.SCRIPT_PREFIX}-search-result-badge`;
                badge.textContent = 'AI 回答';

                const meta = document.createElement('div');
                meta.className = `${DS.SCRIPT_PREFIX}-search-result-meta`;
                meta.textContent = `${(item.sources && item.sources.length) || 0} 条来源`;

                header.appendChild(badge);
                header.appendChild(meta);
                card.appendChild(header);

                const answerBody = document.createElement('div');
                answerBody.className = `${DS.SCRIPT_PREFIX}-search-answer-body ${DS.SCRIPT_PREFIX}-assistant-message`;

                let mainAnswer = item.answer || '';
                if (item.sources && Array.isArray(item.sources) && item.sources.length > 0) {
                    mainAnswer = mainAnswer.replace(/\[([\d,\s]+)\]/g, (match, p1) => {
                        const numbers = p1.split(',').map(n => n.trim()).filter(Boolean);
                        return numbers.map(num => {
                            const sourceIndex = parseInt(num, 10) - 1;
                            const source = (sourceIndex >= 0 && sourceIndex < item.sources.length) ? item.sources[sourceIndex] : null;
                            const title = source ? source.title : `来源 ${num}`;
                            return `<sup class="${DS.SCRIPT_PREFIX}-citation" title="${DS.utils.escapeHtml(title)}">${num}</sup>`;
                        }).join('');
                    });
                }

                DS.utils.renderMarkdown(mainAnswer, answerBody);

                const refContainer = this._createReferenceList(item.sources || []);
                answerBody.appendChild(refContainer);
                card.appendChild(answerBody);
                return card;
            }

            return card;
        }

        _createSearchProgress(logs, isLoading) {
            const wrap = document.createElement('div');
            wrap.className = `${DS.SCRIPT_PREFIX}-search-progress`;

            const title = document.createElement('div');
            title.className = `${DS.SCRIPT_PREFIX}-search-progress-title`;
            title.textContent = isLoading ? '正在搜索与筛选证据' : '搜索已完成';
            wrap.appendChild(title);

            const track = document.createElement('div');
            track.className = `${DS.SCRIPT_PREFIX}-search-progress-track`;
            ['Tavily 基础搜索', 'Tavily 域名搜索', '筛选高价值结果', '生成专业回答'].forEach((step, index) => {
                const stepEl = document.createElement('div');
                stepEl.className = `${DS.SCRIPT_PREFIX}-search-progress-step`;
                if (index < logs.length || (!isLoading && index === logs.length)) stepEl.classList.add('done');
                if (isLoading && index === logs.length) stepEl.classList.add('active');
                stepEl.innerHTML = `<span class="${DS.SCRIPT_PREFIX}-search-progress-dot"></span><span>${step}</span>`;
                track.appendChild(stepEl);
            });
            wrap.appendChild(track);

            if (logs.length > 0) {
                const logList = document.createElement('div');
                logList.className = `${DS.SCRIPT_PREFIX}-search-progress-logs`;
                logs.slice(-4).forEach(log => {
                    const line = document.createElement('div');
                    line.className = `${DS.SCRIPT_PREFIX}-search-progress-log`;
                    line.textContent = log;
                    logList.appendChild(line);
                });
                wrap.appendChild(logList);
            }

            return wrap;
        }

        _createReferenceList(sources) {
            const wrap = document.createElement('div');
            wrap.className = `${DS.SCRIPT_PREFIX}-search-source-section`;

            const title = document.createElement('div');
            title.className = `${DS.SCRIPT_PREFIX}-search-source-title`;
            title.textContent = '参考来源';
            wrap.appendChild(title);

            const grid = document.createElement('div');
            grid.className = `${DS.SCRIPT_PREFIX}-search-source-grid`;

            sources.forEach(source => {
                const link = document.createElement('a');
                link.className = `${DS.SCRIPT_PREFIX}-search-source-item`;
                link.href = source.url || '#';
                link.target = '_blank';
                link.rel = 'noreferrer';

                const name = document.createElement('div');
                name.className = `${DS.SCRIPT_PREFIX}-search-source-name`;
                name.textContent = source.title || source.url || '未命名来源';

                const domain = document.createElement('div');
                domain.className = `${DS.SCRIPT_PREFIX}-search-source-domain`;
                const metaParts = [
                    this._getDomain(source.url || ''),
                    source.sourcePriority || '',
                    source.sourceCategory || '',
                    source.publishedDate || ''
                ].filter(Boolean);
                domain.textContent = metaParts.join(' · ');

                link.appendChild(name);
                link.appendChild(domain);
                grid.appendChild(link);
            });

            wrap.appendChild(grid);
            return wrap;
        }

        _createEmptyState(config) {
            const container = document.createElement('div');
            container.className = `${DS.SCRIPT_PREFIX}-search-hero`;

            const logo = document.createElement('div');
            logo.className = `${DS.SCRIPT_PREFIX}-search-hero-logo`;
            logo.innerHTML = `${DS.ICONS.SEARCH}<span>AI 搜索</span>`;
            container.appendChild(logo);

            const subtitle = document.createElement('div');
            subtitle.className = `${DS.SCRIPT_PREFIX}-search-hero-subtitle`;
            subtitle.textContent = '支持简洁 / 深度两种模式。深度模式会结合行业框定、来源优先级和原文证据，组织更专业的回答。';
            container.appendChild(subtitle);

            const panel = this._createSearchComposer(config, { compact: false });
            panel.classList.add(`${DS.SCRIPT_PREFIX}-search-hero-panel`);
            container.appendChild(panel);

            return container;
        }

        _createSearchFooter(config) {
            const footer = document.createElement('div');
            footer.className = `${DS.SCRIPT_PREFIX}-search-footer`;

            const divider = document.createElement('div');
            divider.className = `${DS.SCRIPT_PREFIX}-search-footer-divider`;
            footer.appendChild(divider);

            const hint = document.createElement('div');
            hint.className = `${DS.SCRIPT_PREFIX}-search-footer-hint`;
            hint.textContent = '这是一个全新的搜索区，可以直接输入新问题继续搜索。';
            footer.appendChild(hint);

            const panel = this._createSearchComposer(config, { compact: true });
            footer.appendChild(panel);
            return footer;
        }

        _createSearchComposer(config, options = {}) {
            const compact = !!options.compact;
            const wrapper = document.createElement('div');
            wrapper.className = `${DS.SCRIPT_PREFIX}-search-composer${compact ? ' compact' : ''}`;

            const inputRow = document.createElement('div');
            inputRow.className = `${DS.SCRIPT_PREFIX}-search-composer-row`;

            const textarea = document.createElement('textarea');
            textarea.className = `${DS.SCRIPT_PREFIX}-search-input`;
            textarea.placeholder = compact ? '输入新问题，Enter 发送' : '输入你想搜索的问题，Enter 发送';
            textarea.rows = 1;
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = `${Math.min(this.scrollHeight, 180)}px`;
            });
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const value = textarea.value.trim();
                    if (value) this.executeSearch(value, config);
                }
            });

            const searchBtn = document.createElement('button');
            searchBtn.className = `${DS.SCRIPT_PREFIX}-search-submit`;
            searchBtn.type = 'button';
            searchBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>`;
            searchBtn.addEventListener('click', () => {
                const value = textarea.value.trim();
                if (value) this.executeSearch(value, config);
            });

            inputRow.appendChild(textarea);
            inputRow.appendChild(searchBtn);
            wrapper.appendChild(inputRow);

            const optionsRow = document.createElement('div');
            optionsRow.className = `${DS.SCRIPT_PREFIX}-search-options`;

            const modeSwitch = document.createElement('div');
            modeSwitch.className = `${DS.SCRIPT_PREFIX}-search-mode-switch`;

            const searchSettings = this._getSearchSettings(config);
            const fastMode = document.createElement('button');
            fastMode.type = 'button';
            fastMode.className = `${DS.SCRIPT_PREFIX}-search-mode-btn ${searchSettings.searchMode === 'fast' ? 'active' : ''}`;
            fastMode.textContent = '简洁';

            const deepMode = document.createElement('button');
            deepMode.type = 'button';
            deepMode.className = `${DS.SCRIPT_PREFIX}-search-mode-btn ${searchSettings.searchMode === 'deep' ? 'active' : ''}`;
            deepMode.textContent = '深度';

            const updateMode = async (mode) => {
                config.searchSettings = this._getSearchSettings(config);
                config.searchSettings.searchMode = mode;
                await DS.storage.set({ searchSettings: config.searchSettings });
                fastMode.classList.toggle('active', mode === 'fast');
                deepMode.classList.toggle('active', mode === 'deep');
            };

            fastMode.addEventListener('click', () => updateMode('fast'));
            deepMode.addEventListener('click', () => updateMode('deep'));
            modeSwitch.appendChild(fastMode);
            modeSwitch.appendChild(deepMode);
            optionsRow.appendChild(modeSwitch);

            const modelWrap = document.createElement('label');
            modelWrap.className = `${DS.SCRIPT_PREFIX}-search-model-wrap`;
            modelWrap.innerHTML = '<span>模型</span>';

            const modelSelect = document.createElement('select');
            modelSelect.className = `${DS.SCRIPT_PREFIX}-search-model-select`;
            this._populateModelSelect(modelSelect, config, 'search');
            modelSelect.addEventListener('change', async e => {
                const newId = e.target.value;
                config.activeSearchProfileId = newId;
                await DS.storage.set({ activeSearchProfileId: newId });
            });
            modelWrap.appendChild(modelSelect);
            optionsRow.appendChild(modelWrap);

            wrapper.appendChild(optionsRow);
            return wrapper;
        }

        _populateModelSelect(select, config, mode) {
            select.innerHTML = '';
            if (!config.apiProfiles || !Array.isArray(config.apiProfiles)) return;

            config.apiProfiles.forEach(profile => {
                const opt = document.createElement('option');
                opt.value = profile.id;
                opt.textContent = profile.name;
                select.appendChild(opt);
            });

            const activeId = mode === 'search' ? config.activeSearchProfileId : null;
            if (activeId && config.apiProfiles.some(p => p.id === activeId)) {
                select.value = activeId;
            } else if (config.apiProfiles.length > 0) {
                select.value = config.apiProfiles[0].id;
            }
        }

        async executeSearch(query, config) {
            if (this.isLoading) {
                DS.utils.showToast('当前搜索尚未完成，请等待结果返回。', 'error');
                return;
            }

            this.lastConfig = config;
            config.searchSettings = this._getSearchSettings(config);

            const tavilyData = DS.ApiService.getTavilyKey(config.searchSettings);

            const activeProfile = Array.isArray(config.apiProfiles)
                ? config.apiProfiles.find(p => p.id === config.activeSearchProfileId)
                : null;
            if (!activeProfile || !activeProfile.key?.trim()) {
                DS.utils.showToast('请先配置搜索模型 API', 'error');
                return;
            }

            try {
                const permissionChecks = [DS.ApiService.ensureHostPermission(activeProfile.url)];
                if (tavilyData) permissionChecks.push(DS.ApiService.ensureHostPermission('https://api.tavily.com/search'));
                if (config.searchSettings.dataSources?.openFda?.enabled) permissionChecks.push(DS.ApiService.ensureHostPermission('https://api.fda.gov/drug/label.json'));
                if (config.searchSettings.dataSources?.clinicalTrials?.enabled) permissionChecks.push(DS.ApiService.ensureHostPermission('https://clinicaltrials.gov/api/v2/studies'));
                await Promise.all(permissionChecks);
            } catch (error) {
                DS.utils.showToast(`搜索配置不可用：${error.message}`, 'error');
                return;
            }

            const mode = config.searchSettings.searchMode || 'fast';
            this.session = [
                { type: 'query', content: query },
                { type: 'status', logs: ['开始搜索'] }
            ];
            this.isLoading = true;
            this.render();

            const updateStatus = (msg) => {
                const statusItem = this.session.find(i => i.type === 'status');
                if (statusItem) statusItem.logs.push(msg);
                this.render();
            };

            try {
                const includeDomains = this._collectDomains(config.searchSettings);
                const searchTasks = [
                    this._getPublicDrugSources(query, config.searchSettings)
                ];
                if (tavilyData) {
                    searchTasks.push(this._runTavilySearch(query, tavilyData.key, false, []));
                    searchTasks.push(includeDomains.length
                        ? this._runTavilySearch(query, tavilyData.key, true, includeDomains)
                        : Promise.resolve([]));
                }
                updateStatus(tavilyData
                    ? (includeDomains.length ? '并行检索 Tavily、指定域名与公开药物数据源' : '检索 Tavily 与公开药物数据源')
                    : '检索 OpenFDA 与 ClinicalTrials.gov 公开数据源');
                const [publicResults, baseResults = [], domainResults = []] = await Promise.all(searchTasks);
                if (!tavilyData && !publicResults.length) {
                    throw new Error('未配置 Tavily API Key，且公开药物数据源未返回结果。请使用有效成分、商品名或英文名称重试，或在设置中配置 Tavily。');
                }

                if (tavilyData) {
                    await DS.storage.set({ searchSettings: tavilyData.updatedSettings });
                }

                const merged = this._mergeTavilyResults(baseResults, domainResults, publicResults);
                if (!merged.length) throw new Error('未找到搜索结果');

                if (mode === 'fast') {
                    updateStatus('整理摘要并生成回答');
                    const answerSources = this._selectBalancedResults(merged, 8, 3);
                    const answer = await this._generateFastAnswer(query, answerSources, activeProfile);
                    this._finishSearch(query, answer, answerSources);
                } else {
                    updateStatus('筛选高价值结果');
                    const candidates = this._selectBalancedResults(merged, 12, 4);
                    const picked = await this._pickHighValueResults(query, candidates, activeProfile);
                    updateStatus('获取原文');
                    const evidence = await this._extractDeepEvidence(picked, query, tavilyData?.key);
                    updateStatus('生成专业回答');
                    const answer = await this._generateAnswer(query, evidence, activeProfile);
                    this._finishSearch(query, answer, evidence);
                }
            } catch (error) {
                DS.utils.showToast(`搜索失败：${error.message}`, 'error');
                this.session = this.session.filter(i => i.type !== 'status');
            } finally {
                this.isLoading = false;
                this.render();
            }
        }

        _finishSearch(query, answer, sources) {
            this.session = this.session.filter(i => i.type !== 'status');
            const resultEntry = {
                answer,
                sources: sources.map(r => {
                    const priorityInfo = this._getSourcePriorityInfo(r.url);
                    return {
                        title: r.title,
                        url: r.url,
                        sourcePriority: priorityInfo.level,
                        sourceCategory: priorityInfo.category,
                        publishedDate: r.publishedDate || ''
                    };
                })
            };
            this.session.push({ type: 'result', ...resultEntry });
            this.history.unshift({ query, ...resultEntry, timestamp: new Date().toISOString() });
            if (this.history.length > 50) this.history.pop();
            DS.storage.set({ searchHistory: this.history });
        }

        async _runTavilySearch(query, tavilyKey, useDomainSearch, includeDomains) {
            const payload = {
                query,
                search_depth: 'advanced',
                include_answer: false,
                include_raw_content: false,
                max_results: 8
            };

            if (useDomainSearch && includeDomains.length > 0) {
                payload.include_domains = includeDomains;
            }

            const response = await DS.ApiService.callApiInBackground({
                url: 'https://api.tavily.com/search',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tavilyKey}`
                },
                data: JSON.stringify(payload)
            });

            const data = JSON.parse(response.text);
            return Array.isArray(data.results) ? data.results : [];
        }

        _mergeTavilyResults(baseResults, domainResults, publicResults = []) {
            const merged = new Map();

            const addResults = (results, channel) => {
                results.forEach(item => {
                    const url = (item.url || '').trim();
                    const key = this._getCanonicalResultKey(url) || `${item.title || ''}-${item.content || ''}`.slice(0, 160);
                    if (!key) return;

                    const normalized = {
                        title: item.title || url || '未命名来源',
                        url,
                        content: item.content || item.raw_content || '',
                        raw_content: item.raw_content || '',
                        score: Number(item.score) || 0,
                        publishedDate: this._extractPublishedDate(item),
                        searchChannels: [channel]
                    };
                    const existing = merged.get(key);

                    if (!existing) {
                        merged.set(key, normalized);
                        return;
                    }

                    existing.searchChannels = [...new Set([...existing.searchChannels, channel])];
                    if (normalized.score > existing.score) existing.score = normalized.score;
                    if (normalized.content.length > existing.content.length) {
                        existing.content = normalized.content;
                        existing.raw_content = normalized.raw_content;
                        existing.title = normalized.title || existing.title;
                        existing.url = normalized.url || existing.url;
                    }
                    if (!existing.publishedDate && normalized.publishedDate) {
                        existing.publishedDate = normalized.publishedDate;
                    }
                });
            };

            addResults(baseResults, 'general');
            addResults(domainResults, 'domain');
            addResults(publicResults, 'public-api');
            return [...merged.values()].sort((a, b) => b.score - a.score);
        }

        _selectBalancedResults(results, limit, minimumDomainResults) {
            const ranked = [...results].sort((a, b) => b.score - a.score);
            const selected = [];
            const selectedUrls = new Set();

            const add = (item) => {
                const key = item.url || `${item.title}-${item.content}`;
                if (selectedUrls.has(key) || selected.length >= limit) return;
                selectedUrls.add(key);
                selected.push(item);
            };

            ranked
                .filter(item => item.searchChannels?.includes('domain'))
                .slice(0, minimumDomainResults)
                .forEach(add);
            ranked.forEach(add);

            return selected.sort((a, b) => b.score - a.score);
        }

        _getCanonicalResultKey(url) {
            if (!url) return '';
            try {
                const parsed = new URL(url);
                parsed.hash = '';
                ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
                    parsed.searchParams.delete(key);
                });
                return parsed.toString().replace(/\/$/, '');
            } catch (error) {
                return url.replace(/\/$/, '');
            }
        }

        async _pickHighValueResults(query, results, activeProfile) {
            const promptConfig = this._getPromptConfig();
            const candidates = results
                .filter(item => !!item.url)
                .slice(0, 12)
                .map((item, index) => ({
                    id: index + 1,
                    title: item.title,
                    snippet: item.content || item.raw_content || '',
                    priority: this._getSourcePriorityInfo(item.url)
                }));

            if (!candidates.length) return results.slice(0, 5);

            try {
                const prompt = [
                    promptConfig.role,
                    promptConfig.industryInstruction,
                    `行业参考范围：${promptConfig.profileDescriptions || '按当前搜索设置中的行业角色和来源规则执行。'}`,
                    `来源优先级规则：${promptConfig.sourcePriorityRules}`,
                    '你正在为当前问题做深度阅读前的结果筛选。',
                    '请优先选出既与问题直接相关，又能支持后续判断和回答组织的结果。',
                    '在相关性接近时，优先选择符合来源优先级规则的结果。',
                    '只返回 JSON，例如 {"picked":[1,2,3]}。',
                    '',
                    `问题：${query}`,
                    '',
                    '候选结果：',
                    candidates.map(item => `[${item.id}] ${item.title}\n来源优先级：${item.priority.level}（${item.priority.category}）\n摘要：${item.snippet}`).join('\n\n')
                ].join('\n');

                const payload = DS.ApiService.createApiPayload(
                    activeProfile,
                    [{ role: 'user', content: prompt }],
                    0.2
                );
                const res = await DS.ApiService.callApiInBackground(payload);
                const data = JSON.parse(res.text);
                const text = DS.ApiService.getApiResponseText(data, activeProfile);
                const parsed = DS.utils.extractAndParseJSON(text);
                const pickedIds = Array.isArray(parsed?.picked) ? parsed.picked : [];
                const picked = pickedIds
                    .map(id => candidates.find(item => item.id === Number(id)))
                    .filter(Boolean)
                    .map(item => results[item.id - 1])
                    .filter(Boolean);
                return picked.length > 0 ? picked.slice(0, 5) : results.slice(0, 5);
            } catch (error) {
                return results.slice(0, 5);
            }
        }

        async _generateFastAnswer(query, results, activeProfile) {
            const promptConfig = this._getPromptConfig();
            const top = results.map((item, index) => {
                const priority = this._getSourcePriorityInfo(item.url);
                const text = item.content || item.raw_content || '';
                return `[${index + 1}] ${item.title}\n来源优先级：${priority.level}（${priority.category}）\n摘要：${text}`;
            }).join('\n\n');

            const prompt = [
                promptConfig.role,
                promptConfig.industryInstruction,
                `行业参考范围：${promptConfig.profileDescriptions || '按当前搜索设置中的行业角色和来源规则执行。'}`,
                `来源优先级规则：${promptConfig.sourcePriorityRules}`,
                `回答组织建议：${promptConfig.answerTemplate}`,
                '请基于以下搜索结果的标题和摘要回答问题。',
                '优先使用高优先级来源支持结论，不要编造未提供的事实。',
                '如果一级来源不足，请明确提示“证据有限”或“需进一步核实”。',
                '',
                `问题：${query}`,
                '',
                '搜索结果：',
                top
            ].join('\n');

            const payload = DS.ApiService.createApiPayload(
                activeProfile,
                [{ role: 'user', content: prompt }],
                0.3
            );
            const res = await DS.ApiService.callApiInBackground(payload);
            const data = JSON.parse(res.text);
            return DS.ApiService.getApiResponseText(data, activeProfile);
        }

        async _extractDeepEvidence(results, query, tavilyKey) {
            if (!tavilyKey) {
                return results.map(item => ({
                    title: item.title,
                    url: item.url,
                    summary: item.content || '',
                    text: item.raw_content || item.content || '',
                    evidenceType: 'public-api-or-summary',
                    publishedDate: item.publishedDate || ''
                }));
            }
            const urls = results.map(item => item.url).filter(Boolean).slice(0, 5);
            if (!urls.length) {
                return results.map(item => ({
                    title: item.title,
                    url: item.url,
                    summary: item.content || '',
                    text: item.raw_content || item.content || '',
                    evidenceType: 'summary-fallback',
                    publishedDate: item.publishedDate || ''
                }));
            }

            const response = await DS.ApiService.callApiInBackground({
                url: 'https://api.tavily.com/extract',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tavilyKey}`
                },
                data: JSON.stringify({
                    urls,
                    query,
                    extract_depth: 'advanced',
                    format: 'markdown',
                    include_images: false,
                    include_favicon: false
                })
            });

            const data = JSON.parse(response.text);
            const extracted = Array.isArray(data.results) ? data.results : [];
            if (!extracted.length) {
                return results.map(item => ({
                    title: item.title,
                    url: item.url,
                    summary: item.content || '',
                    text: item.raw_content || item.content || '',
                    evidenceType: 'summary-fallback',
                    publishedDate: item.publishedDate || ''
                }));
            }

            const extractedByUrl = new Map(extracted.map(item => [this._getCanonicalResultKey(item.url), item]));
            return results.map(source => {
                const item = extractedByUrl.get(this._getCanonicalResultKey(source.url));
                return {
                    title: source.title || item?.url || source.url,
                    url: source.url,
                    summary: source.content || '',
                    text: item?.raw_content || item?.content || source.raw_content || source.content || '',
                    evidenceType: item ? 'original' : 'summary-fallback',
                    publishedDate: source.publishedDate || this._extractPublishedDate(item || {})
                };
            });
        }

        async _generateAnswer(query, evidence, activeProfile) {
            const promptConfig = this._getPromptConfig();
            const priorityStats = this._countHighPrioritySources(evidence);
            const context = evidence.map((item, index) => {
                const priority = this._getSourcePriorityInfo(item.url);
                const body = item.text || item.summary || '';
                const parts = [
                    `[${index + 1}] ${item.title}`,
                    `来源优先级：${priority.level}（${priority.category}）`,
                    `证据类型：${item.evidenceType === 'summary-fallback' ? '搜索摘要（原文提取失败）' : '原文'}`,
                    item.publishedDate ? `发布时间：${item.publishedDate}` : '',
                    body
                ].filter(Boolean);
                return parts.join('\n');
            }).join('\n\n');

            const prompt = [
                promptConfig.role,
                promptConfig.industryInstruction,
                `行业参考范围：${promptConfig.profileDescriptions || '按当前搜索设置中的行业角色和来源规则执行。'}`,
                `来源优先级规则：${promptConfig.sourcePriorityRules}`,
                `回答组织建议：${promptConfig.answerTemplate}`,
                `当前高优先级来源覆盖：${priorityStats.highPriorityCount}/${priorityStats.totalCount}`,
                '请结合原文证据回答；标注为“搜索摘要（原文提取失败）”的条目只能作为辅助信息，不能被表述为原文证据。优先围绕用户问题给出可被证据支持的判断。',
                '默认优先采用“结论 + 依据 + 风险”的组织方式，并补充“建议下一步”，但不要机械照搬标题。',
                '如高优先级来源不足、结论存在冲突或证据不充分，请明确写出“证据有限”或“需进一步核实”。',
                '不要编造原文没有提供的事实。',
                '',
                `问题：${query}`,
                '',
                '证据：',
                context
            ].join('\n');

            const payload = DS.ApiService.createApiPayload(
                activeProfile,
                [{ role: 'user', content: prompt }],
                0.4
            );

            const res = await DS.ApiService.callApiInBackground(payload);
            const data = JSON.parse(res.text);
            return DS.ApiService.getApiResponseText(data, activeProfile);
        }

        _getSearchSettings(config) {
            const defaults = (DS.DEFAULT_CONFIG && DS.DEFAULT_CONFIG.searchSettings) || {};
            const current = (config && config.searchSettings) || {};
            return {
                ...defaults,
                ...current,
                tavilyKeys: Array.isArray(current.tavilyKeys) ? current.tavilyKeys : (defaults.tavilyKeys || ['']),
                dataSources: {
                    ...(defaults.dataSources || {}),
                    ...(current.dataSources || {}),
                    openFda: {
                        ...(defaults.dataSources?.openFda || {}),
                        ...(current.dataSources?.openFda || {})
                    },
                    clinicalTrials: {
                        ...(defaults.dataSources?.clinicalTrials || {}),
                        ...(current.dataSources?.clinicalTrials || {})
                    }
                },
                customSearchProfiles: Array.isArray(current.customSearchProfiles) ? current.customSearchProfiles : (defaults.customSearchProfiles || [])
            };
        }

        async _getPublicDrugSources(query, searchSettings) {
            const sources = searchSettings.dataSources || {};
            const tasks = [];
            if (sources.openFda?.enabled) tasks.push(this._searchOpenFda(query, sources.openFda));
            if (sources.clinicalTrials?.enabled) tasks.push(this._searchClinicalTrials(query));
            if (!tasks.length) return [];
            const results = await Promise.allSettled(tasks);
            return results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
        }

        async _searchOpenFda(query, settings) {
            const drugName = this._extractDrugSearchTerm(query);
            if (!drugName) return [];
            const safeName = drugName.replace(/"/g, '');
            const search = `openfda.generic_name:"${safeName}"+openfda.brand_name:"${safeName}"`;
            const keySuffix = settings.accessKey?.trim() ? `&api_key=${encodeURIComponent(settings.accessKey.trim())}` : '';
            const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(search)}&limit=3${keySuffix}`;
            try {
                const response = await DS.ApiService.callApiInBackground({ url, headers: { 'Content-Type': 'application/json' }, data: null, method: 'GET' });
                const data = JSON.parse(response.text);
                return (data.results || []).map((item, index) => {
                    const openfda = item.openfda || {};
                    const brand = (openfda.brand_name || []).join(', ');
                    const generic = (openfda.generic_name || []).join(', ');
                    const manufacturer = (openfda.manufacturer_name || []).join(', ');
                    const indications = (item.indications_and_usage || []).join(' ').slice(0, 1800);
                    const warnings = (item.warnings || item.warnings_and_cautions || []).join(' ').slice(0, 900);
                    const ingredients = (item.inactive_ingredient || []).join(' ').slice(0, 900);
                    return {
                        title: `OpenFDA 标签：${brand || generic || drugName}`,
                        url: `https://open.fda.gov/drug/label/`,
                        content: [`有效成分/通用名：${generic || '未提供'}`, `商品名：${brand || '未提供'}`, `企业：${manufacturer || '未提供'}`, `适应症：${indications || '未提供'}`, warnings ? `警告：${warnings}` : '', ingredients ? `非活性成分：${ingredients}` : ''].filter(Boolean).join('\n'),
                        raw_content: JSON.stringify(item),
                        score: 1 - index * 0.01,
                        publishedDate: item.effective_time || '',
                        sourcePriority: '一级',
                        sourceCategory: '监管/官方'
                    };
                });
            } catch (error) {
                return [];
            }
        }

        async _searchClinicalTrials(query) {
            const drugName = this._extractDrugSearchTerm(query);
            if (!drugName) return [];
            const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(drugName)}&pageSize=5&countTotal=true&fields=NCTId,BriefTitle,OverallStatus,Phase,LeadSponsorName,Condition,InterventionName,LastUpdatePostDate`;
            try {
                const response = await DS.ApiService.callApiInBackground({ url, headers: { 'Content-Type': 'application/json' }, data: null, method: 'GET' });
                const data = JSON.parse(response.text);
                return (data.studies || []).map((study, index) => {
                    const protocol = study.protocolSection || {};
                    const id = protocol.identificationModule?.nctId || '';
                    const title = protocol.identificationModule?.briefTitle || drugName;
                    const status = protocol.statusModule?.overallStatus || '未提供';
                    const phases = (protocol.designModule?.phases || []).join(', ') || '未提供';
                    const sponsor = protocol.sponsorCollaboratorsModule?.leadSponsor?.name || '未提供';
                    const conditions = (protocol.conditionsModule?.conditions || []).join(', ');
                    const interventions = (protocol.armsInterventionsModule?.interventions || []).map(item => item.name).join(', ');
                    return {
                        title: `ClinicalTrials.gov：${id} ${title}`,
                        url: id ? `https://clinicaltrials.gov/study/${id}` : 'https://clinicaltrials.gov/',
                        content: [`登记号：${id || '未提供'}`, `状态：${status}`, `阶段：${phases}`, `申办方：${sponsor}`, conditions ? `疾病：${conditions}` : '', interventions ? `干预：${interventions}` : '', '说明：试验登记状态不等同于疗效或安全性结论。'].filter(Boolean).join('\n'),
                        raw_content: JSON.stringify(study),
                        score: 0.9 - index * 0.01,
                        publishedDate: protocol.statusModule?.lastUpdatePostDateStruct?.date || '',
                        sourcePriority: '二级',
                        sourceCategory: '临床试验登记'
                    };
                });
            } catch (error) {
                return [];
            }
        }

        _extractDrugSearchTerm(query) {
            const text = (query || '').trim();
            if (!text) return '';
            const aliases = {
                '奥希替尼': 'osimertinib',
                '泰瑞沙': 'osimertinib',
                'Osimertinib': 'osimertinib',
                'Tagrisso': 'osimertinib'
            };
            const matchedAlias = Object.keys(aliases).find(alias => text.toLowerCase().includes(alias.toLowerCase()));
            if (matchedAlias) return aliases[matchedAlias];
            const match = text.match(/[A-Za-z][A-Za-z0-9-]{2,}/);
            return match ? match[0] : text.split(/[，,。；;：:\s]/)[0];
        }

        _getPromptConfig() {
            const settings = this._getSearchSettings(window.DS.config || this.lastConfig || {});
            return {
                role: settings.searchRole || '你是专业的信息分析助手，请基于可靠来源回答用户问题。',
                industryInstruction: settings.deepSearchInstruction || '回答时优先基于证据，区分结论、依据、风险与建议下一步。不要夸大结论。',
                sourcePriorityRules: settings.sourcePriorityRules || '参考优先级：优先官方、监管、指南、标准、临床试验注册库，其次期刊、学会和专业机构，最后企业官网、行业媒体和资讯站。',
                answerTemplate: settings.defaultAnswerTemplate || '默认优先采用“结论 + 依据 + 风险”结构，并补充“建议下一步”。',
                profileDescriptions: this._collectProfileDescriptions(settings)
            };
        }

        _collectProfileDescriptions(searchSettings) {
            return (searchSettings.customSearchProfiles || [])
                .filter(profile => profile && profile.enabled !== false && profile.description && profile.description.trim())
                .map(profile => profile.description.trim())
                .join('；');
        }

        _countHighPrioritySources(items) {
            const totalCount = items.length;
            const highPriorityCount = items.filter(item => this._getSourcePriorityInfo(item.url).level === '一级').length;
            return { totalCount, highPriorityCount };
        }

        _extractPublishedDate(item) {
            return item.published_date || item.publishedDate || item.date || item.created_at || item.updated_at || '';
        }

        _collectDomains(searchSettings) {
            const domains = [];
            (searchSettings?.customSearchProfiles || []).forEach(profile => {
                if (profile && profile.enabled === false) return;
                const raw = profile.domains || '';
                raw.split(/[\n,]/).forEach(item => {
                    const value = item.trim();
                    if (!value) return;
                    const host = value
                        .replace(/^https?:\/\//i, '')
                        .replace(/\/.*$/, '')
                        .toLowerCase();
                    if (host && !domains.includes(host)) {
                        domains.push(host);
                    }
                });
            });
            return domains.slice(0, 50);
        }

        _getSourcePriorityInfo(url) {
            const domain = this._getDomain(url).toLowerCase();
            const settings = this._getSearchSettings(window.DS.config || this.lastConfig || {});
            const configured = settings.sourcePriorityDomains || {};
            const tier1 = Array.isArray(configured.tier1) ? configured.tier1 : [];
            const tier2 = Array.isArray(configured.tier2) ? configured.tier2 : [];
            const tier3 = Array.isArray(configured.tier3) ? configured.tier3 : [];

            if (domain.includes('clinicaltrials.gov') || domain.includes('chinadrugtrials.org.cn')) {
                return { level: '二级', category: '临床试验登记' };
            }
            if (domain.endsWith('.gov') || tier1.some(item => domain.includes(item))) {
                return { level: '一级', category: '监管/官方' };
            }
            if (tier2.some(item => domain.includes(item))) {
                return { level: '二级', category: '期刊/学会' };
            }
            if (tier3.some(item => domain.includes(item))) {
                return { level: '三级', category: '企业/媒体' };
            }
            if (domain.includes('journal') || domain.includes('pubmed') || domain.includes('wiley') || domain.includes('springer') || domain.includes('nature')) {
                return { level: '二级', category: '期刊/学会' };
            }
            if (domain.includes('news') || domain.includes('media')) {
                return { level: '三级', category: '企业/媒体' };
            }
            return { level: '三级', category: '综合来源' };
        }

        _getDomain(url) {
            try {
                return new URL(url).hostname;
            } catch (error) {
                return url || '';
            }
        }
    }

    DS.SearchModule = new SearchModule();

})(window);
