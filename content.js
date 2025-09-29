// content.js (无需修改)

(function() {
    'use strict';

    /**
     * 当用户按住 Alt 键（在 Mac 上是 Option 键）并释放鼠标时，
     * 获取选中的文本并发送给后台脚本进行处理。
     * @param {MouseEvent} event - 鼠标事件对象。
     */
    function handleTextSelection(event) {
        // 检查 Alt 键是否被按下。
        if (event.altKey) {
            const selectedText = window.getSelection().toString().trim();
            
            // 如果确实有选中的文本，则发送消息。
            if (selectedText) {
                 // 将选中的文本发送到 background.js。
                 chrome.runtime.sendMessage({
                     type: 'TRANSLATE_SELECTION',
                     text: selectedText
                 });
            }
        }
    }

    // 在整个文档上添加一个 `mouseup` 事件监听器来捕获文本选择动作。
    document.addEventListener('mouseup', handleTextSelection);

})();