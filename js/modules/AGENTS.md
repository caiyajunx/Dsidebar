# Modules Directory Knowledge Base

**Generated:** 2026-05-19
**Project:** DSider v1.5

## Overview
`js/modules/` 存放功能模块，全部挂载到 `window.DS` 下，以单例形式工作。

## Structure
```text
js/modules/
├── prompts.js
├── translate.js
├── chat.js
├── search.js
└── settings.js
```

## Module Roles
- `translate.js`：翻译会话、结果渲染、历史记录。
- `chat.js`：聊天会话、消息渲染、思考态。
- `search.js`：简洁/深度搜索、Tavily 搜索、原文提取、结果渲染。
- `settings.js`：API 配置、搜索配置、界面配置。
- `prompts.js`：Prompt 分类与编辑。

## Notes
- 搜索模块不再使用居中搜索旧布局类名。
- 深度搜索保留原文获取流程，不做文本截断。
- 结果渲染统一走模块内部构建，不直接依赖外部旧 DOM 片段。

