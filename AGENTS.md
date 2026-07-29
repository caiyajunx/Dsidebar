# PROJECT KNOWLEDGE BASE

下载或推送 GitHub 代码时，优先使用 GitHub CLI（`gh`）。

**Generated:** 2026-07-08
**Project:** DSider v1.5 - Browser Extension

## Overview
DSider 是一个基于 Manifest V3 的 Chrome 扩展，提供 AI 翻译、聊天、搜索、Prompt 管理、Aily、IMA、玻尔、问答、KIMI、豆包和配置管理。项目使用纯 JavaScript，全局命名空间为 `window.DS`。

## Current Structure
```text
D:\Dsidebar v1.5\
├── css/
│   └── style.css
├── icons/
├── js/
│   ├── background.js
│   ├── content.js
│   ├── sidebar.js
│   ├── ima-modifier.js
│   ├── injector.js
│   ├── utils.js
│   ├── constants.js
│   ├── api_service.js
│   ├── defaults/
│   │   ├── defaultConfig.js
│   │   └── exampleConfig.js
│   ├── lib/marked.min.js
│   └── modules/
│       ├── prompts.js
│       ├── translate.js
│       ├── chat.js
│       ├── search.js
│       └── settings.js
├── sidebar.html
├── manifest.json
├── .gitignore
└── AGENTS.md
```

## Script Order
`sidebar.html` 必须按以下顺序加载脚本：
1. `js/lib/marked.min.js`
2. `js/constants.js`
3. `js/defaults/defaultConfig.js`
4. `js/defaults/exampleConfig.js`
5. `js/utils.js`
6. `js/api_service.js`
7. `js/modules/prompts.js`
8. `js/modules/translate.js`
9. `js/modules/chat.js`
10. `js/modules/search.js`
11. `js/modules/settings.js`
12. `js/sidebar.js`

## Current Rules
- 默认配置必须保持安全：不内置真实 API Key，不内置个人密钥，不内置私有用户配置。
- 常用 API 接口、模型名、行业搜索画像放在 `js/defaults/exampleConfig.js`，作为示例配置，Key 必须为空。
- 用户私有配置通过设置页导入/导出，不进入仓库。
- 搜索页当前是单次搜索，不走多轮对话。
- 深度模式必须获取原文，先由 AI 选高价值结果，再拉取原文回答。
- API 调用统一走 `DS.ApiService`，存储统一走 `DS.storage`。
- `DS.utils.showLoadingIndicator()` 和 `hideLoadingIndicator()` 仍保留兼容旧类名。

## File Map
- `js/defaults/defaultConfig.js`：安全默认配置，不包含真实 Key。
- `js/defaults/exampleConfig.js`：内置示例配置，包含常用 API 示例和搜索画像，Key 为空。
- `js/modules/settings.js`：API、Tavily、界面、搜索配置，以及配置导入/导出/示例导入。
- `js/modules/search.js`：搜索执行、去重、模式切换、原文提取、结果渲染。
- `js/modules/chat.js`：聊天会话、消息渲染、加载态。
- `js/modules/translate.js`：翻译会话与历史。
- `js/sidebar.js`：主界面、模式切换、历史面板、输入区。
- `js/background.js`：消息监听与 API 代理。

## Open Source Hygiene
- 发布前必须扫描 `tvly-`、`sk-`、`api_key`、`apikey`、`secret`、`token`、`Bearer` 等敏感关键词。
- 用户导出的配置文件应匹配 `.gitignore`，不要提交到仓库。
- 新增示例服务商时，只能添加空 Key 示例，并同步检查 `manifest.json` 的必要 `host_permissions`。
