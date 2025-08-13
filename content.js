let mediaRecorder;
let recordedChunks = [];
let recordingData = {
  startTime: null,
  endTime: null,
  consoleLogs: [],
  networkRequests: [],
  screenRecording: null
};

// Inject script to capture console logs and network requests
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
document.head.appendChild(script);

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'startRecording') {
    startRecording().then(() => {
      sendResponse({success: true});
    }).catch(error => {
      console.error('Recording failed:', error);
      sendResponse({success: false, error: error.message});
    });
    return true;
  } else if (request.action === 'stopRecording') {
    stopRecording();
    sendResponse({success: true});
  }
});

// Listen for data from injected script
window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  if (event.data.type === 'CONSOLE_LOG') {
    recordingData.consoleLogs.push({
      timestamp: Date.now(),
      level: event.data.level,
      message: event.data.message,
      args: event.data.args
    });
  } else if (event.data.type === 'NETWORK_REQUEST') {
    recordingData.networkRequests.push({
      timestamp: Date.now(),
      method: event.data.method,
      url: event.data.url,
      status: event.data.status,
      response: event.data.response
    });
  }
});

async function startRecording() {
  recordingData = {
    startTime: Date.now(),
    endTime: null,
    consoleLogs: [],
    networkRequests: [],
    screenRecording: null,
    url: window.location.href,
    userAgent: navigator.userAgent
  };

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { mediaSource: 'screen' },
      audio: true
    });

    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];

    mediaRecorder.ondataavailable = function(event) {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = function() {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onload = function() {
        recordingData.screenRecording = reader.result;
        chrome.storage.local.set({recordingData: recordingData});
      };
      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();
    
    // Start monitoring
    window.postMessage({type: 'START_MONITORING'}, '*');
    
  } catch (error) {
    throw new Error('Failed to start screen recording: ' + error.message);
  }
}

function stopRecording() {
  recordingData.endTime = Date.now();
  
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  
  window.postMessage({type: 'STOP_MONITORING'}, '*');
}