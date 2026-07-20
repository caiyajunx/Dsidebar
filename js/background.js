// background.js
importScripts('api_service.js');

const ApiService = globalThis.DS.ApiService;
const API_TIMEOUT_MS = 95000;

async function openSidebarAndQueueTranslation(text, windowId, tabId) {
  await chrome.sidePanel.open({ windowId });
  await chrome.storage.session.set({ pendingTranslation: text });
  await chrome.sidePanel.setOptions({ tabId, enabled: true });
}

function formatFetchError(error) {
  if (error.name === 'AbortError') {
    return '请求超时 (95秒)，请检查网络状况或 API 响应速度。';
  }
  if (error.message && error.message.includes('Failed to fetch')) {
    return '网络连接中断或被拦截 (Failed to fetch)。请检查您的 VPN、代理设置或防火墙。';
  }
  return error.message || '网络请求失败，请检查网络连接。';
}

async function fetchApiPayload(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
        const response = await fetch(payload.url, {
            method: payload.method || 'POST',
            headers: payload.headers,
            body: payload.method === 'GET' ? undefined : payload.data,
      signal: controller.signal
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} (${response.statusText}) ${responseText.slice(0, 200)}`);
    }

    return {
      status: response.status,
      statusText: response.statusText,
      text: responseText
    };
  } catch (error) {
    throw new Error(formatFetchError(error));
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'omit'
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);
  }

  return response.text();
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'translate-selection-ai',
      title: '使用 AI 助手翻译',
      contexts: ['selection']
    });
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRANSLATE_SELECTION' && request.text) {
    if (sender.tab?.windowId && sender.tab?.id) {
      openSidebarAndQueueTranslation(request.text, sender.tab.windowId, sender.tab.id);
    }
    return;
  }

  if (request.type === 'TRANSLATE_SELECTION_INLINE' && request.text) {
    (async () => {
      try {
        await handleInlineTranslation(request.text, sender.tab);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Inline translation error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.type === 'FETCH_API') {
    (async () => {
      try {
        const data = await fetchApiPayload(request.payload);
        sendResponse({ success: true, data });
      } catch (error) {
        console.error('Background fetch error detail:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.type === 'FETCH_TEXT' && request.url) {
    (async () => {
      try {
        const text = await fetchText(request.url);
        sendResponse({ success: true, data: { text } });
      } catch (error) {
        console.error('Background text fetch error:', error);
        sendResponse({ success: false, error: error.message || '原文抓取失败' });
      }
    })();
    return true;
  }
});

async function handleInlineTranslation(text, tab) {
  if (!tab || !tab.id) {
    throw new Error('无法获取标签页信息');
  }

  chrome.tabs.sendMessage(tab.id, { type: 'TRANSLATE_START' });

  const data = await chrome.storage.local.get([
    'apiProfiles',
    'activeTranslateProfileId',
    'translationPrompt',
    'targetLanguage',
    'vocabularies',
    'activeVocabularyId'
  ]);

  const apiProfiles = Array.isArray(data.apiProfiles) ? data.apiProfiles : [];
  const activeProfile = apiProfiles.find(p => p.id === data.activeTranslateProfileId);
  if (!activeProfile || !activeProfile.key?.trim()) {
    throw new Error('未找到可用 API 配置，请在设置中配置翻译 API');
  }

  const prompt = {
    domain: '综合领域',
    audience: '普通大众',
    context: '通用沟通',
    tone: '中立',
    ...(data.translationPrompt || {})
  };
  const targetLanguage = data.targetLanguage || '中文';

  const mainInstruction = [
    `作为一名专业的 ${prompt.domain} 翻译，请将以下文本翻译成 ${targetLanguage}。`,
    `目标读者是 ${prompt.audience}，应用场景为 ${prompt.context}，请保持 ${prompt.tone} 的风格。`,
    '只对内容做翻译，无须进行回答、总结、解释等其它指令。',
    '如果原文包含 Markdown 结构（标题、列表、表格、代码块、引用、链接等），请在译文中尽量保留原有 Markdown 结构。'
  ].join('');

  const vocabularies = Array.isArray(data.vocabularies) ? data.vocabularies : [];
  const activeVocab = vocabularies.find(v => v.id === data.activeVocabularyId);
  let userMessageContent = '';
  if (activeVocab && activeVocab.content?.trim()) {
    userMessageContent += `\n\n翻译需参考如下词汇表：\n${activeVocab.content.trim()}`;
  }
  userMessageContent += `\n\n待翻译文本如下：\n${text}`;

  const payload = ApiService.createApiPayload(
    activeProfile,
    [
      { role: 'system', content: mainInstruction },
      { role: 'user', content: userMessageContent }
    ],
    0.3
  );

  try {
    const responseData = await fetchApiPayload(payload);
    const parsed = JSON.parse(responseData.text);
    const translation = ApiService.getApiResponseText(parsed, activeProfile);

    if (!translation) {
      throw new Error('API返回内容为空或格式不正确。');
    }

    chrome.tabs.sendMessage(tab.id, {
      type: 'TRANSLATE_RESULT',
      originalText: text,
      translatedText: translation,
      targetLanguage
    });
  } catch (error) {
    console.error('Inline translation error:', error);
    try {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TRANSLATE_ERROR',
        error: error.message || '翻译失败'
      });
    } catch (sendError) {
      console.error('Failed to send translation error message:', sendError);
    }
    throw error;
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translate-selection-ai' && info.selectionText && tab?.windowId && tab?.id) {
    openSidebarAndQueueTranslation(info.selectionText, tab.windowId, tab.id);
  }
});
