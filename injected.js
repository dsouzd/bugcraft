let isMonitoring = false;
let originalConsole = {};
let originalFetch = window.fetch;
let originalXHROpen = XMLHttpRequest.prototype.open;
let originalXHRSend = XMLHttpRequest.prototype.send;

// Listen for monitoring commands
window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  if (event.data.type === 'START_MONITORING') {
    startMonitoring();
  } else if (event.data.type === 'STOP_MONITORING') {
    stopMonitoring();
  }
});

function startMonitoring() {
  if (isMonitoring) return;
  isMonitoring = true;
  
  // Intercept console methods
  ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
    originalConsole[method] = console[method];
    console[method] = function(...args) {
      window.postMessage({
        type: 'CONSOLE_LOG',
        level: method,
        message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
        args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
      }, '*');
      originalConsole[method].apply(console, args);
    };
  });

  // Intercept fetch
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    return originalFetch.apply(this, args)
      .then(response => {
        response.clone().text().then(text => {
          window.postMessage({
            type: 'NETWORK_REQUEST',
            method: options.method || 'GET',
            url: url,
            status: response.status,
            response: text.substring(0, 1000) // Limit response size
          }, '*');
        });
        return response;
      })
      .catch(error => {
        window.postMessage({
          type: 'NETWORK_REQUEST',
          method: options.method || 'GET',
          url: url,
          status: 0,
          response: error.message
        }, '*');
        throw error;
      });
  };

  // Intercept XMLHttpRequest
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._method = method;
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    const xhr = this;
    const originalOnReadyStateChange = xhr.onreadystatechange;
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        window.postMessage({
          type: 'NETWORK_REQUEST',
          method: xhr._method || 'GET',
          url: xhr._url,
          status: xhr.status,
          response: xhr.responseText ? xhr.responseText.substring(0, 1000) : ''
        }, '*');
      }
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, arguments);
      }
    };
    
    return originalXHRSend.apply(this, args);
  };
}

function stopMonitoring() {
  if (!isMonitoring) return;
  isMonitoring = false;
  
  // Restore console methods
  Object.keys(originalConsole).forEach(method => {
    console[method] = originalConsole[method];
  });
  
  // Restore fetch and XHR
  window.fetch = originalFetch;
  XMLHttpRequest.prototype.open = originalXHROpen;
  XMLHttpRequest.prototype.send = originalXHRSend;
}