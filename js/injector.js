// injector.js
(function() {
  'use strict';
  
  const urlParams = new URLSearchParams(window.location.search);

  // 检查是否在 iframe 中并且 URL 含有我们的信标
  if (window.self !== window.top && urlParams.has('in-dsider-panel')) {
    // 如果是，立即给 <html> 标签添加一个 class
    document.documentElement.classList.add('in-dsider-panel');
  }
})();