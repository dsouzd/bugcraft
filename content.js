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
      sendResponse({success: true, started: true});
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
      audio: false
    });

    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];

    // Handle stream end (when user clicks "Stop sharing")
    stream.getVideoTracks()[0].onended = function() {
      stopRecording();
      chrome.storage.local.set({isRecording: false});
    };

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
        chrome.storage.local.set({recordingData: recordingData}, function() {
          downloadFiles();
        });
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

function downloadFiles() {
  chrome.storage.local.get(['recordingData'], function(result) {
    if (result.recordingData) {
      const data = result.recordingData;
      const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
      
      // Download JSON report immediately
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `bugcraft-report-${timestamp}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);
      
      // Download video immediately if available
      if (data.screenRecording) {
        setTimeout(() => {
          const videoLink = document.createElement('a');
          videoLink.href = data.screenRecording;
          videoLink.download = `bugcraft-video-${timestamp}.webm`;
          document.body.appendChild(videoLink);
          videoLink.click();
          document.body.removeChild(videoLink);
        }, 100);
      }
    }
  });
}