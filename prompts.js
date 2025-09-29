// prompts.js (V3.0 - 新布局咒语管理器)

const PromptManager = (function() {
    'use strict';

    // --- 模块内部变量 ---
    let panelElement, promptsData = {},
        activeCategory = null, activePromptIndex = -1, isEditing = false;

    // DOM 元素引用
    let categoriesScroller, titlesScroller, contentArea,
        contentDisplay, contentEditor, footer,
        newPromptBtn, editBtn, saveBtn, cancelBtn, deleteBtn;

    const STORAGE_KEY = 'ai_translator_prompts';

    // --- 默认咒语数据 ---
    const DEFAULT_PROMPTS = {
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

    // --- 数据处理 ---
    async function loadPrompts() {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        if (result[STORAGE_KEY] && Object.keys(result[STORAGE_KEY]).length > 0) {
            promptsData = result[STORAGE_KEY];
        } else {
            promptsData = JSON.parse(JSON.stringify(DEFAULT_PROMPTS)); // 深拷贝
            await savePrompts();
        }
    }

    async function savePrompts() {
        await chrome.storage.local.set({ [STORAGE_KEY]: promptsData });
    }

    // --- UI 创建 ---
    function createPanel() {
        if (panelElement) return panelElement;

        panelElement = document.createElement('div');
        panelElement.className = 'aiTranslator-prompts-panel';

        // 1. 顶部 Header
        const header = document.createElement('div');
        header.className = 'aiTranslator-prompts-header';
        header.innerHTML = '<h2>咒语 (Prompts)</h2>';
        const headerActions = document.createElement('div');
        headerActions.className = 'aiTranslator-prompts-header-actions';
        const importBtn = document.createElement('button');
        importBtn.textContent = '导入';
        importBtn.onclick = handleImport;
        const exportBtn = document.createElement('button');
        exportBtn.textContent = '导出';
        exportBtn.onclick = handleExport;
        headerActions.appendChild(importBtn);
        headerActions.appendChild(exportBtn);
        header.appendChild(headerActions);
        
        // 2. 分类滚动区
        categoriesScroller = document.createElement('div');
        categoriesScroller.className = 'prompt-horizontal-scroller';
        
        // 3. 标题滚动区
        titlesScroller = document.createElement('div');
        titlesScroller.className = 'prompt-horizontal-scroller';

        // 4. 内容区
        contentArea = document.createElement('div');
        contentArea.className = 'prompt-content-area';
        contentDisplay = document.createElement('div');
        contentDisplay.id = 'prompt-content-display';
        contentEditor = document.createElement('textarea');
        contentEditor.id = 'prompt-content-editor-textarea';
        contentEditor.placeholder = '选择或创建一个咒语...';
        contentArea.appendChild(contentDisplay);
        contentArea.appendChild(contentEditor);

        // 5. 底部操作栏
        footer = document.createElement('div');
        footer.className = 'prompt-action-footer';
        newPromptBtn = document.createElement('button');
        newPromptBtn.id = 'prompt-footer-new';
        newPromptBtn.textContent = '新增';
        newPromptBtn.onclick = handleNewPrompt;
        editBtn = document.createElement('button');
        editBtn.id = 'prompt-footer-edit';
        editBtn.textContent = '编辑';
        editBtn.onclick = handleEdit;
        saveBtn = document.createElement('button');
        saveBtn.id = 'prompt-footer-save';
        saveBtn.textContent = '保存';
        saveBtn.onclick = handleSave;
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'prompt-footer-cancel';
        cancelBtn.textContent = '取消';
        cancelBtn.onclick = handleCancel;
        deleteBtn = document.createElement('button');
        deleteBtn.id = 'prompt-footer-delete';
        deleteBtn.textContent = '删除';
        deleteBtn.onclick = handleDelete;
        
        footer.appendChild(newPromptBtn);
        footer.appendChild(editBtn);
        footer.appendChild(saveBtn);
        footer.appendChild(cancelBtn);
        footer.appendChild(deleteBtn);

        panelElement.appendChild(header);
        panelElement.appendChild(categoriesScroller);
        panelElement.appendChild(titlesScroller);
        panelElement.appendChild(contentArea);
        panelElement.appendChild(footer);
        
        // 初始化
        (async () => {
            await loadPrompts();
            updateUI();
        })();

        return panelElement;
    }

    // --- UI 更新与渲染 ---
    function updateUI() {
        renderCategories();
        renderTitles();
        renderContent();
        updateFooterButtons();
    }

    function renderCategories() {
        categoriesScroller.innerHTML = '';
        const categories = Object.keys(promptsData);
        if (categories.length > 0 && (!activeCategory || !promptsData[activeCategory])) {
            activeCategory = categories[0];
        }
        categories.forEach(cat => {
            const chip = document.createElement('div');
            chip.className = 'prompt-chip-button';
            chip.textContent = cat;
            if (cat === activeCategory) chip.classList.add('active');
            chip.onclick = () => {
                if (isEditing) return; // 编辑模式下禁止切换
                activeCategory = cat;
                activePromptIndex = -1; // 选择新分类时重置
                updateUI();
            };
            categoriesScroller.appendChild(chip);
        });
    }

    function renderTitles() {
        titlesScroller.innerHTML = '';
        if (!activeCategory) {
            titlesScroller.textContent = '请先选择分类';
            return;
        };

        const prompts = promptsData[activeCategory] || [];
        if (prompts.length > 0 && activePromptIndex === -1) {
            activePromptIndex = 0; // 默认选中第一个
        } else if (prompts.length === 0) {
            activePromptIndex = -1;
        }

        prompts.forEach((prompt, index) => {
            const chip = document.createElement('div');
            chip.className = 'prompt-chip-button';
            chip.textContent = prompt.title;
            if (index === activePromptIndex) chip.classList.add('active');
            chip.onclick = () => {
                if (isEditing) return; // 编辑模式下禁止切换
                activePromptIndex = index;
                updateUI();
            };
            titlesScroller.appendChild(chip);
        });
    }

    function renderContent() {
        const prompt = promptsData[activeCategory]?.[activePromptIndex];
        if (prompt) {
            contentDisplay.textContent = prompt.content;
            contentEditor.value = prompt.content;
        } else {
            contentDisplay.textContent = '请选择或创建一个咒语查看内容。';
            contentEditor.value = '';
        }
        contentArea.classList.toggle('editing', isEditing);
    }
    
    function updateFooterButtons() {
        const hasSelection = activeCategory && activePromptIndex !== -1;
        newPromptBtn.classList.toggle('hidden', isEditing);
        editBtn.classList.toggle('hidden', isEditing || !hasSelection);
        deleteBtn.classList.toggle('hidden', isEditing || !hasSelection);
        saveBtn.classList.toggle('hidden', !isEditing);
        cancelBtn.classList.toggle('hidden', !isEditing);
    }

    // --- 事件处理 ---
    function handleEdit() {
        isEditing = true;
        updateUI();
        contentEditor.focus();
    }

    function handleCancel() {
        isEditing = false;
        updateUI();
    }
    
    async function handleSave() {
        const prompt = promptsData[activeCategory]?.[activePromptIndex];
        if (prompt) {
            prompt.content = contentEditor.value;
            await savePrompts();
            isEditing = false;
            updateUI();
        }
    }

    async function handleDelete() {
        const prompt = promptsData[activeCategory]?.[activePromptIndex];
        if (prompt && confirm(`确定要删除咒语 "${prompt.title}" 吗？`)) {
            promptsData[activeCategory].splice(activePromptIndex, 1);
            activePromptIndex = -1; // 重置选择
            await savePrompts();
            updateUI();
        }
    }

    async function handleNewPrompt() {
        if (!activeCategory) {
            alert('请先选择一个分类！');
            return;
        }
        const title = prompt('请输入新的咒语标题：');
        if (title && title.trim()) {
            const newTitle = title.trim();
            if (promptsData[activeCategory].some(p => p.title === newTitle)) {
                alert('该标题已存在于当前分类中！');
                return;
            }
            const newPrompt = { title: newTitle, content: '在此处输入咒语内容...' };
            promptsData[activeCategory].push(newPrompt);
            activePromptIndex = promptsData[activeCategory].length - 1;
            isEditing = true;
            await savePrompts();
            updateUI();
            contentEditor.focus();
            contentEditor.select();
        }
    }

    // 导入/导出功能不变
    function handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = readerEvent => {
                try {
                    const content = readerEvent.target.result;
                    const importedData = JSON.parse(content);
                    if (typeof importedData === 'object' && !Array.isArray(importedData)) {
                        if (confirm('导入将覆盖现有所有咒语，是否继续？')) {
                            promptsData = importedData;
                            activeCategory = null;
                            activePromptIndex = -1;
                            isEditing = false;
                            savePrompts().then(updateUI);
                            alert('导入成功！');
                        }
                    } else { throw new Error('文件格式不正确。'); }
                } catch (err) { alert('导入失败：' + err.message); }
            };
            reader.readAsText(file, 'UTF-8');
        };
        input.click();
    }
    
    function handleExport() {
        const dataStr = JSON.stringify(promptsData, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `ai_assistant_prompts_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return {
        createPanel: createPanel
    };
})();