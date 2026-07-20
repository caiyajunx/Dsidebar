// js/modules/prompts.js
(function(window) {
    'use strict';

    window.DS = window.DS || {};

    class PromptsModule {
        constructor() {
            this.id = 'prompts';
            this.panelElement = null;
            this.promptsData = {};
            this.activeCategory = null;
            this.activePromptIndex = -1;
            this.isEditing = false;
            this.isRenaming = false;
            
            this.STORAGE_KEY = 'ai_translator_prompts';
            this.DEFAULT_PROMPTS = window.DS.DEFAULT_PROMPTS || {
                "通用": [
                    { title: "总结摘要", content: "请帮我将以下内容总结成一段100字左右的摘要：\n\n[在此处粘贴文本]" },
                    { title: "润色文本", content: "请帮我润色以下段落，使其更具专业性和可读性：\n\n[在此处粘贴文本]" }
                ],
                "编程": [
                    { title: "代码解释", content: "请解释以下代码的功能，并指出可能的优化点：\n\n```[语言]\n[在此处粘贴代码]\n```" },
                    { title: "Regex生成", content: "请为我生成一个正则表达式，用于匹配[描述需求，例如：匹配有效的电子邮件地址]。" }
                ],
                "医学翻译": [
                    { title: "药学翻译", content: "你是一个专业的药学翻译，请将以下药学相关内容翻译成中文，要求语言严谨、精确、并保留专业术语的准确性：\n\n[在此处粘贴英文摘要]" }
                ]
            };
        }

        init(config) {
            // Config might not contain prompts data if it's stored separately key
            this.loadPrompts();
        }

        async loadPrompts() {
            const result = await DS.storage.get(this.STORAGE_KEY);
            if (result[this.STORAGE_KEY] && Object.keys(result[this.STORAGE_KEY]).length > 0) {
                this.promptsData = result[this.STORAGE_KEY];
                let changed = false;
                Object.entries(this.DEFAULT_PROMPTS).forEach(([category, prompts]) => {
                    if (!this.promptsData[category]) {
                        this.promptsData[category] = JSON.parse(JSON.stringify(prompts));
                        changed = true;
                    }
                });
                if (changed) await this.savePrompts();
            } else {
                this.promptsData = JSON.parse(JSON.stringify(this.DEFAULT_PROMPTS));
                this.savePrompts();
            }
            if(this.panelElement) this.updateUI();
        }

        async savePrompts() {
            await DS.storage.set({ [this.STORAGE_KEY]: this.promptsData });
        }

        createPanel() {
            if (this.panelElement) return this.panelElement;

            this.panelElement = document.createElement('div');
            this.panelElement.className = 'aiTranslator-prompts-panel';

            // 1. Header
            const header = document.createElement('div');
            header.className = 'aiTranslator-prompts-header';
            header.innerHTML = '<h2>咒语 (Prompts)</h2>';
            
            const headerActions = document.createElement('div');
            headerActions.className = 'aiTranslator-prompts-header-actions';
            
            const deleteCategoryBtn = document.createElement('button');
            deleteCategoryBtn.textContent = '删除分类';
            deleteCategoryBtn.className = 'prompt-header-delete-btn';
            deleteCategoryBtn.onclick = () => this.handleDeleteCategory();
            headerActions.appendChild(deleteCategoryBtn);

            const importBtn = document.createElement('button');
            importBtn.textContent = '导入';
            importBtn.onclick = () => this.handleImport();
            headerActions.appendChild(importBtn);

            const exportBtn = document.createElement('button');
            exportBtn.textContent = '导出';
            exportBtn.onclick = () => this.handleExport();
            headerActions.appendChild(exportBtn);
            
            header.appendChild(headerActions);
            
            // 2. Categories
            const categoryContainer = document.createElement('div');
            categoryContainer.className = 'prompt-scroller-container prompt-category-container';
            this.categoriesScroller = document.createElement('div');
            this.categoriesScroller.className = 'prompt-horizontal-scroller';
            const newCategoryBtn = document.createElement('button');
            newCategoryBtn.className = 'prompt-add-btn';
            newCategoryBtn.textContent = '+';
            newCategoryBtn.onclick = () => this.handleNewCategory();
            categoryContainer.appendChild(this.categoriesScroller);
            categoryContainer.appendChild(newCategoryBtn);

            // 3. Titles
            const titleContainer = document.createElement('div');
            titleContainer.className = 'prompt-scroller-container prompt-title-container';
            this.titlesScroller = document.createElement('div');
            this.titlesScroller.className = 'prompt-horizontal-scroller';
            const newPromptBtnScroller = document.createElement('button');
            newPromptBtnScroller.className = 'prompt-add-btn';
            newPromptBtnScroller.textContent = '+';
            newPromptBtnScroller.onclick = () => this.handleNewPrompt();
            titleContainer.appendChild(this.titlesScroller);
            titleContainer.appendChild(newPromptBtnScroller);

            // 4. Content
            this.contentArea = document.createElement('div');
            this.contentArea.className = 'prompt-content-area';
            this.contentDisplay = document.createElement('div');
            this.contentDisplay.id = 'prompt-content-display';
            this.contentEditor = document.createElement('textarea');
            this.contentEditor.id = 'prompt-content-editor-textarea';
            this.contentEditor.placeholder = '选择或创建一个咒语...';
            this.contentArea.appendChild(this.contentDisplay);
            this.contentArea.appendChild(this.contentEditor);

            // 5. Footer
            this.footer = document.createElement('div');
            this.footer.className = 'prompt-action-footer';
            
            this.editBtn = document.createElement('button');
            this.editBtn.id = 'prompt-footer-edit';
            this.editBtn.textContent = '编辑';
            this.editBtn.onclick = () => this.handleEdit();
            
            this.deleteBtn = document.createElement('button');
            this.deleteBtn.id = 'prompt-footer-delete';
            this.deleteBtn.textContent = '删除咒语';
            this.deleteBtn.onclick = () => this.handleDeletePrompt();

            this.cancelBtn = document.createElement('button');
            this.cancelBtn.id = 'prompt-footer-cancel';
            this.cancelBtn.textContent = '取消';
            this.cancelBtn.onclick = () => this.handleCancel();
            
            const spacer = document.createElement('div');
            spacer.style.flexGrow = '1';

            this.copyBtn = document.createElement('button');
            this.copyBtn.id = 'prompt-footer-copy';
            this.copyBtn.textContent = '复制';
            this.copyBtn.onclick = () => this.handleCopy();
            
            this.saveBtn = document.createElement('button');
            this.saveBtn.id = 'prompt-footer-save';
            this.saveBtn.textContent = '保存';
            this.saveBtn.onclick = () => this.handleSave();

            this.footer.appendChild(this.editBtn);
            this.footer.appendChild(this.deleteBtn);
            this.footer.appendChild(this.cancelBtn);
            this.footer.appendChild(spacer);
            this.footer.appendChild(this.saveBtn);
            this.footer.appendChild(this.copyBtn);
            
            this.panelElement.appendChild(header);
            this.panelElement.appendChild(categoryContainer);
            this.panelElement.appendChild(titleContainer);
            this.panelElement.appendChild(this.contentArea);
            this.panelElement.appendChild(this.footer);
            
            this.updateUI();
            return this.panelElement;
        }

        updateUI() {
            this.renderCategories();
            this.renderTitles();
            this.renderContent();
            this.updateFooterButtons();
        }

        renderCategories() {
            this.categoriesScroller.innerHTML = '';
            const categories = Object.keys(this.promptsData);
            if (categories.length > 0 && (!this.activeCategory || !this.promptsData[this.activeCategory])) {
                this.activeCategory = categories[0];
            }
            categories.forEach(cat => {
                const chip = document.createElement('div');
                chip.className = 'prompt-chip-button';
                chip.textContent = cat;
                if (cat === this.activeCategory) chip.classList.add('active');
                
                chip.onclick = () => {
                    if (this.isEditing || this.isRenaming) return;
                    this.activeCategory = cat;
                    this.activePromptIndex = -1;
                    this.updateUI();
                };
                chip.ondblclick = () => {
                    if (this.isEditing || this.isRenaming) return;
                    this.startCategoryRename(chip, cat);
                };
                this.categoriesScroller.appendChild(chip);
            });
        }

        renderTitles() {
            this.titlesScroller.innerHTML = '';
            if (!this.activeCategory) {
                this.titlesScroller.textContent = '请先选择或创建分类';
                return;
            };

            const prompts = this.promptsData[this.activeCategory] || [];
            if (prompts.length > 0 && this.activePromptIndex === -1) {
                this.activePromptIndex = 0;
            } else if (prompts.length === 0) {
                this.activePromptIndex = -1;
            }

            prompts.forEach((prompt, index) => {
                const chip = document.createElement('div');
                chip.className = 'prompt-chip-button';
                chip.textContent = prompt.title;
                if (index === this.activePromptIndex) chip.classList.add('active');
                
                chip.onclick = () => {
                    if (this.isEditing || this.isRenaming) return;
                    this.activePromptIndex = index;
                    this.updateUI();
                };
                chip.ondblclick = () => {
                    if (this.isEditing || this.isRenaming) return;
                    this.startTitleRename(chip, prompt, index);
                };
                this.titlesScroller.appendChild(chip);
            });
        }

        renderContent() {
            const prompt = this.promptsData[this.activeCategory]?.[this.activePromptIndex];
            if (prompt) {
                this.contentDisplay.textContent = prompt.content;
                this.contentEditor.value = prompt.content;
            } else {
                this.contentDisplay.textContent = '请选择或创建一个咒语查看内容。';
                this.contentEditor.value = '';
            }
            this.contentArea.classList.toggle('editing', this.isEditing);
        }

        updateFooterButtons() {
            const hasSelection = this.activeCategory && this.activePromptIndex !== -1;
            
            this.editBtn.classList.toggle('hidden', this.isEditing || !hasSelection);
            this.copyBtn.classList.toggle('hidden', this.isEditing || !hasSelection);
            this.deleteBtn.classList.toggle('hidden', this.isEditing || !hasSelection);
            this.saveBtn.classList.toggle('hidden', !this.isEditing);
            this.cancelBtn.classList.toggle('hidden', !this.isEditing);
            
            const buttonsToDisable = [this.editBtn, this.copyBtn, this.deleteBtn, this.saveBtn, this.cancelBtn];
            if (this.isRenaming) {
                buttonsToDisable.forEach(btn => btn.disabled = true);
            } else if (this.isEditing) {
                [this.editBtn, this.copyBtn, this.deleteBtn].forEach(btn => btn.disabled = true);
                [this.saveBtn, this.cancelBtn].forEach(btn => btn.disabled = false);
            } else {
                [this.editBtn, this.copyBtn, this.deleteBtn].forEach(btn => btn.disabled = false);
                [this.saveBtn, this.cancelBtn].forEach(btn => btn.disabled = true);
            }
            this.contentEditor.disabled = this.isRenaming;
        }

        handleNewCategory() {
            if (this.isEditing || this.isRenaming) return;
            const name = prompt("请输入新分类名称:");
            if(name) {
                if(this.promptsData[name]) return alert("已存在");
                this.promptsData[name] = [];
                this.activeCategory = name;
                this.activePromptIndex = -1;
                this.savePrompts().then(() => this.updateUI());
            }
        }
        
        handleNewPrompt() {
            if (!this.activeCategory || this.isEditing || this.isRenaming) return;
            const title = prompt("请输入新咒语标题:");
            if(title) {
                this.promptsData[this.activeCategory].push({ title, content: "..." });
                this.activePromptIndex = this.promptsData[this.activeCategory].length - 1;
                this.isEditing = true;
                this.savePrompts().then(() => this.updateUI());
            }
        }

        async handleDeleteCategory() {
            if(!this.activeCategory) return;
            if (!(await DS.utils.confirm("删除分类?"))) return;
            delete this.promptsData[this.activeCategory];
            this.activeCategory = Object.keys(this.promptsData)[0] || null;
            this.savePrompts().then(() => this.updateUI());
        }

        async handleDeletePrompt() {
            if(this.activePromptIndex === -1) return;
            if (!(await DS.utils.confirm("删除咒语?"))) return;
            this.promptsData[this.activeCategory].splice(this.activePromptIndex, 1);
            this.activePromptIndex = -1;
            this.savePrompts().then(() => this.updateUI());
        }

        handleEdit() { this.isEditing = true; this.updateUI(); }
        handleCancel() { this.isEditing = false; this.updateUI(); }
        
        async handleSave() {
            if(this.activePromptIndex !== -1) {
                this.promptsData[this.activeCategory][this.activePromptIndex].content = this.contentEditor.value;
                await this.savePrompts();
                this.isEditing = false;
                this.updateUI();
            }
        }

        handleCopy() {
            if(this.activePromptIndex !== -1) {
                const content = this.promptsData[this.activeCategory][this.activePromptIndex].content;
                navigator.clipboard.writeText(content);
                DS.utils.showToast("已复制");
            }
        }
        
        handleImport() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (!data || typeof data !== 'object') {
                        DS.utils.showToast('无效的文件格式', 'error');
                        return;
                    }
                    // Merge data
                    for (const category in data) {
                        if (Array.isArray(data[category])) {
                            if (!this.promptsData[category]) {
                                this.promptsData[category] = [];
                            }
                            // Check for duplicates based on title
                            data[category].forEach(prompt => {
                                if (prompt.title && prompt.content) {
                                    const exists = this.promptsData[category].some(
                                        p => p.title === prompt.title
                                    );
                                    if (!exists) {
                                        this.promptsData[category].push(prompt);
                                    }
                                }
                            });
                        }
                    }
                    await this.savePrompts();
                    this.updateUI();
                    DS.utils.showToast('导入成功', 'success');
                } catch (err) {
                    console.error('Import error:', err);
                    DS.utils.showToast('导入失败: ' + err.message, 'error');
                }
            };
            input.click();
        }

        handleExport() {
            const dataStr = JSON.stringify(this.promptsData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prompts_backup_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            DS.utils.showToast('导出成功', 'success');
        }

        startCategoryRename(chip, oldName) {
            if (this.isEditing || this.isRenaming) return;
            this.isRenaming = true;
            chip.contentEditable = true;
            chip.focus();
            
            const finishRename = () => {
                chip.contentEditable = false;
                this.isRenaming = false;
                const newName = chip.textContent.trim();
                if (!newName || newName === oldName) {
                    this.updateUI(); // Reset if invalid or unchanged
                    return;
                }
                if (this.promptsData[newName]) {
                    DS.utils.showToast('分类名称已存在', 'error');
                    this.updateUI();
                    return;
                }
                this.promptsData[newName] = this.promptsData[oldName];
                delete this.promptsData[oldName];
                if (this.activeCategory === oldName) {
                    this.activeCategory = newName;
                }
                this.savePrompts().then(() => this.updateUI());
                DS.utils.showToast('重命名成功', 'success');
            };
            
            chip.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    chip.onblur = null;
                    finishRename();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    chip.onblur = null;
                    this.isRenaming = false;
                    this.updateUI();
                }
            };
            
            chip.onblur = () => {
                chip.onblur = null;
                finishRename();
            };
        }

        startTitleRename(chip, prompt, index) {
            if (this.isEditing || this.isRenaming) return;
            this.isRenaming = true;
            chip.contentEditable = true;
            chip.focus();
            
            const finishRename = () => {
                chip.contentEditable = false;
                this.isRenaming = false;
                const newTitle = chip.textContent.trim();
                if (!newTitle || newTitle === prompt.title) {
                    this.updateUI(); // Reset if invalid or unchanged
                    return;
                }
                // Check for duplicate title in same category
                const exists = this.promptsData[this.activeCategory].some(
                    (p, i) => p.title === newTitle && i !== index
                );
                if (exists) {
                    DS.utils.showToast('标题已存在', 'error');
                    this.updateUI();
                    return;
                }
                this.promptsData[this.activeCategory][index].title = newTitle;
                this.savePrompts().then(() => this.updateUI());
                DS.utils.showToast('重命名成功', 'success');
            };
            
            chip.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    chip.onblur = null;
                    finishRename();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    chip.onblur = null;
                    this.isRenaming = false;
                    this.updateUI();
                }
            };
            
            chip.onblur = () => {
                chip.onblur = null;
                finishRename();
            };
        }
    }

    DS.PromptsModule = new PromptsModule();

})(window);
