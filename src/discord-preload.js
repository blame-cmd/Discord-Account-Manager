(function() {
  'use strict';
  
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  
  let injectedToken = null;
  
  Storage.prototype.getItem = function(key) {
    if (key === 'token' && injectedToken) {
      return injectedToken;
    }
    return originalGetItem.apply(this, arguments);
  };
  
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'BLAME_MANAGER_TOKEN') {
      injectedToken = '"' + event.data.token + '"';
      try {
        originalSetItem.call(localStorage, 'token', injectedToken);
      } catch(e) {}
    }
  });
})();
