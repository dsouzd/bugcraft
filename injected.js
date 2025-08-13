if (typeof window.bugcraftMonitoring === 'undefined') {
  window.bugcraftMonitoring = {
    isMonitoring: false,
    originalConsole: {},
    originalFetch: window.fetch,
    originalXHROpen: XMLHttpRequest.prototype.open,
    originalXHRSend: XMLHttpRequest.prototype.send
  };
}

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
  if (window.bugcraftMonitoring.isMonitoring) return;
  window.bugcraftMonitoring.isMonitoring = true;
  
  // Intercept console methods
  ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
    window.bugcraftMonitoring.originalConsole[method] = console[method];
    console[method] = function(...args) {
      window.postMessage({
        type: 'CONSOLE_LOG',
        level: method,
        message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
        args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
      }, '*');
      window.bugcraftMonitoring.originalConsole[method].apply(console, args);
    };
  });

  // Intercept fetch
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    return window.bugcraftMonitoring.originalFetch.apply(this, args)
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
    return window.bugcraftMonitoring.originalXHROpen.apply(this, [method, url, ...args]);
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
    
    return window.bugcraftMonitoring.originalXHRSend.apply(this, args);
  };
}

function stopMonitoring() {
  if (!window.bugcraftMonitoring.isMonitoring) return;
  window.bugcraftMonitoring.isMonitoring = false;
  
  // Restore console methods
  Object.keys(window.bugcraftMonitoring.originalConsole).forEach(method => {
    console[method] = window.bugcraftMonitoring.originalConsole[method];
  });
  
  // Restore fetch and XHR
  window.fetch = window.bugcraftMonitoring.originalFetch;
  XMLHttpRequest.prototype.open = window.bugcraftMonitoring.originalXHROpen;
  XMLHttpRequest.prototype.send = window.bugcraftMonitoring.originalXHRSend;
}