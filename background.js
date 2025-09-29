// background.js (V6.1 - Fixed context menu duplication)

/**
 * 负责打开侧边栏并将待翻译文本存入 session storage。
 * 这个函数现在将 open() 操作放在最前面。
 * @param {string} text - 需要翻译的文本。
 * @param {number} windowId - 目标窗口的ID。
 * @param {number} tabId - 目标标签页的ID。
 */
async function openSidebarAndQueueTranslation(text, windowId, tabId) {
  // 1. **立即打开侧边栏**，以响应用户手势。
  await chrome.sidePanel.open({ windowId });
  
  // 2. 将待翻译文本存入 session storage，供侧边栏读取。
  await chrome.storage.session.set({ pendingTranslation: text });
  
  // 3. (可选) 确保侧边栏已启用。由于open()已调用，此步主要用于确保焦点。
  // 注意：如果 open() 失败，这里也会失败。但我们假设 open() 在用户手势上下文中是成功的。
  await chrome.sidePanel.setOptions({ tabId, enabled: true });
}

// 当用户点击扩展的工具栏图标时，打开侧边栏。
// 简化逻辑以符合用户手势安全策略。
// 反复点击图标会确保侧边栏是打开并获得焦点的状态。
chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// 扩展安装时，创建用于文本选择的右键菜单项。
chrome.runtime.onInstalled.addListener(() => {
  // **FIX**: First, remove any existing context menus to prevent "duplicate id" errors during development reloads.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "translate-selection-ai",
      title: "使用 AI 助手翻译",
      contexts: ["selection"]
    });
  });
});

// 监听来自内容脚本的消息 (Alt+划词)。
// Alt+划词也是一个用户手势，所以可以在其监听器中直接调用包含 open() 的函数。
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // --- 处理翻译选中文本的请求 ---
  if (request.type === 'TRANSLATE_SELECTION' && request.text) {
    if (sender.tab?.windowId && sender.tab?.id) {
      openSidebarAndQueueTranslation(request.text, sender.tab.windowId, sender.tab.id);
    }
    // 返回 true 以表示我们将异步发送响应（虽然这个特定消息类型没有）
    return true; 
  }

  // --- 代表侧边栏处理 API 请求 (此部分逻辑不变) ---
  if (request.type === 'FETCH_API') {
    (async () => {
      try {
        const response = await fetch(request.payload.url, {
          method: 'POST',
          headers: request.payload.headers,
          body: request.payload.data,
          signal: AbortSignal.timeout(95000) // 95秒超时
        });

        const responseData = {
          status: response.status,
          statusText: response.statusText,
          text: await response.text()
        };
        sendResponse({ success: true, data: responseData });

      } catch (error) {
        console.error('Background fetch error:', error);
        let errorMessage = '网络请求失败，请检查网络或 API 设置。';
        if (error && error.name === 'TimeoutError') {
          errorMessage = '请求超时 (45秒)。请检查您的网络连接或 API 服务是否可用。';
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        sendResponse({ success: false, error: errorMessage });
      }
    })();
    return true; // 表示响应是异步发送的。
  }
});

// 监听右键菜单的点击事件。
// 右键菜单点击是一个明确的用户手势。
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate-selection-ai" && info.selectionText && tab?.windowId && tab?.id) {
      openSidebarAndQueueTranslation(info.selectionText, tab.windowId, tab.id);
  }
});