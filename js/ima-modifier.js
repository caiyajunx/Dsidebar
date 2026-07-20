// ima-modifier.js (V11 - Persistent & Precise Enforcement)

(function() {
    'use strict';

    const DEBUG = false;
    const debugLog = (...args) => {
        if (DEBUG) console.log(...args);
    };

    /**
     * 【新增】入口守卫函数
     * 检查当前页面是否在我们的插件侧边栏 iframe 中加载。
     * @returns {boolean}
     */
    const isInsideSidePanel = () => {
        try {
            // 必须同时满足：1. 在一个 frame 里 2. URL 包含我们的信标参数
            const inFrame = window.self !== window.top;
            const urlParams = new URLSearchParams(window.location.search);
            return inFrame && urlParams.has('in-dsider-panel');
        } catch (e) {
            // 发生跨域安全错误时，仅依赖 URL 参数
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.has('in-dsider-panel');
        }
    };

    // 【新增】如果不在侧边栏中，则不执行任何操作
    if (!isInsideSidePanel()) {
        debugLog('IMA modifier: Not inside the side panel, skipping modifications.');
        return;
    }
    
    // -------------------
    // 最稳定和精确的元素选择器
    // -------------------
    
    // 目标侧边栏：#knowledgeBaseMainArea 元素内部的第一个 class 以 "_sidebar_" 开头且包含 "expandable-sidebar-panel-sidebar" 的元素。
    const SIDEBAR_SELECTOR = '#knowledgeBaseMainArea [class^="_sidebar_"].expandable-sidebar-panel-sidebar';

    // 【新增】目标内容容器
    // 适配侧边栏宽度为0后，需要移除主容器的最小宽度限制
    const CONTAINER_SELECTOR = '[class^="_horizontalScrollContainer_"]';
    const CHAT_WRAP_SELECTOR = '[class^="_chatPageAllWrap_"]';


    // -------------------
    // 功能函数
    // -------------------

    // 【新增】中间侧边栏的显示状态控制
    // 默认不隐藏 (false)，由用户点击按钮触发隐藏
    let isMiddleSidebarHidden = false;

    // 【新增】绑定收起按钮点击事件
    const setupCollapseButtonListener = () => {
        const btnSelector = '[class*="_button_"][class*="disableClearSelection"]';
        const btn = document.querySelector(btnSelector);
        if (btn && !btn.dataset.dsiderListenerAttached) {
            btn.addEventListener('click', () => {
                isMiddleSidebarHidden = !isMiddleSidebarHidden;
                // 立即触发样式更新
                enforceStyles();
            });
            btn.dataset.dsiderListenerAttached = 'true';
        }
    };

    /**
     * 一个函数，用来查找并强制设置目标元素的样式
     */
    const enforceStyles = () => {
        // 尝试绑定按钮事件 (防止按钮被重新渲染导致丢失)
        setupCollapseButtonListener();

        // 1. 隐藏固定的 Header (这个逻辑不变)
        const header = document.querySelector('[class^="_pageHeader_"]');
        if (header && header.style.display !== 'none') {
            header.style.display = 'none';
        }

        // 2. 控制中间侧边栏的显示/隐藏
        const sidebar = document.querySelector(SIDEBAR_SELECTOR);
        if (sidebar) {
            if (isMiddleSidebarHidden) {
                // 隐藏状态
                if (sidebar.style.width !== '0px') {
                    sidebar.style.setProperty('width', '0px', 'important');
                    sidebar.style.setProperty('min-width', '0px', 'important');
                    sidebar.style.setProperty('overflow', 'hidden', 'important');
                    sidebar.style.setProperty('display', 'none', 'important'); // 彻底隐藏
                }
            } else {
                // 显示状态：清除强制样式，恢复默认
                if (sidebar.style.width === '0px') {
                    sidebar.style.removeProperty('width');
                    sidebar.style.removeProperty('min-width');
                    sidebar.style.removeProperty('overflow');
                    sidebar.style.removeProperty('display');
                }
            }
        }

        // 3. 移除容器最小宽度限制 (始终执行，保证布局弹性)
        const scrollContainer = document.querySelector(CONTAINER_SELECTOR);
        if (scrollContainer && scrollContainer.style.minWidth !== '0px') {
            scrollContainer.style.setProperty('min-width', '0px', 'important');
        }

        const chatWrap = document.querySelector(CHAT_WRAP_SELECTOR);
        if (chatWrap && chatWrap.style.minWidth !== '0px') {
            chatWrap.style.setProperty('min-width', '0px', 'important');
        }
    };

    // -------------------
    // 启动与监控
    // -------------------

    // 创建一个 MutationObserver 实例
    // 它会持续运行，监控DOM变化
    const observer = new MutationObserver((mutationsList) => {
        // 每次DOM有变化（元素加载、卸载、样式改变等），都重新执行我们的强制函数
        enforceStyles();
    });

    // 等待 body 加载完成后再开始观察
    const startObserver = () => {
        if (document.body) {
            debugLog('IMA modifier: Starting persistent observer (V11).');
            
            // 开始观察 document.body 的所有后代节点，以及它们的属性变化
            // 'attributes: true' 是关键，这样当网站JS修改style属性时我们也能收到通知
            observer.observe(document.body, { 
                childList: true, 
                subtree: true, 
                attributes: true,
                attributeFilter: ['style', 'class'] // 优化：只关心 style 和 class 属性的变化
            });
            
            // 页面加载时也立即执行一次，处理已经存在的元素
            enforceStyles();
        } else {
            // 如果 body 还没好，等一会
            setTimeout(startObserver, 100);
        }
    };

    // 启动整个过程
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }

})();
