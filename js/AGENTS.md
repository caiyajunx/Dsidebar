# JS Directory Knowledge Base

**Generated:** 2026-01-26
**Project:** DSider v1.5

## OVERVIEW
JavaScript 核心功能目录，包含扩展的基础架构和工具函数，采用全局命名空间模式管理所有模块。

## STRUCTURE
```
js/
├── background.js  # Service Worker
├── content.js     # 内容脚本
├── sidebar.js     # 侧边栏主逻辑
├── ima-modifier.js # IMA 页面修饰脚本
├── injector.js    # 注入脚本
├── lib/           # 第三方库
│   └── marked.min.js
├── constants.js   # 静态常量、图标、URL 配置
├── defaults/
│   └── defaultConfig.js  # 默认配置（DS.DEFAULT_CONFIG）
├── utils.js       # 工具函数集合（DS 命名空间初始化、Toast、渲染、存储等）
├── api_service.js # 统一 API 调用层，支持多种 AI 服务
└── modules/       # 功能模块目录
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 工具函数 | utils.js | UI 渲染、消息提示、DOM 操作、转义函数、DS 命名空间初始化 |
| API 请求处理 | api_service.js | 统一错误处理、超时控制、请求格式化 |
| 静态常量 | constants.js | SCRIPT_PREFIX、ICONS、URLS 等 |
| 默认配置 | defaults/defaultConfig.js | DS.DEFAULT_CONFIG（API 方案、翻译提示词、词汇表等） |

## CONVENTIONS
- **全局命名空间**: 所有代码挂载到 window.DS 对象下
- **模块模式**: 使用 IIFE 避免全局污染，立即执行函数封装
- **依赖注入**: 模块通过 DS 全局对象相互引用
- **异步编程**: 大量使用 async/await，Promise 链式调用
- **错误处理**: 统一 try-catch + 错误消息提示机制

## ANTI-PATTERNS (THIS PROJECT)
- **不要直接访问 DOM，使用 utils.js 中的封装函数**
- **不要使用全局变量，全部挂载到 DS 命名空间**
- **不要使用 console.log 直接输出，使用 utils.showToast 提示**
- **不要硬编码 URL，使用 constants.js 中的配置**
- **不要重复封装已有工具函数**

## UNIQUE STYLES
- **IIFE 封装**: `(function(window) { 'use strict'; ... })(window);`
- **类模块**: 功能模块使用类构造函数，通过 new 创建实例
- **属性解构**: `const { TranslateModule, utils } = DS;`
- **条件渲染**: 使用 `!!` 进行布尔转换，如 `if (!!data.length)`