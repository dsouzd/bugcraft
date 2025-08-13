let isRecording = false;

document.addEventListener('DOMContentLoaded', function() {
  const recordBtn = document.getElementById('recordBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const status = document.getElementById('status');

  // Check current recording state
  chrome.storage.local.get(['isRecording'], function(result) {
    if (result.isRecording) {
      updateUI(true);
    }
  });

  recordBtn.addEventListener('click', function() {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  });

  downloadBtn.addEventListener('click', function() {
    downloadReport();
  });

  function startRecording() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'startRecording'}, function(response) {
        if (response && response.success) {
          updateUI(true);
          chrome.storage.local.set({isRecording: true});
        }
      });
    });
  }

  function stopRecording() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopRecording'}, function(response) {
        if (response && response.success) {
          updateUI(false);
          chrome.storage.local.set({isRecording: false});
          downloadBtn.style.display = 'block';
        }
      });
    });
  }

  function updateUI(recording) {
    isRecording = recording;
    if (recording) {
      recordBtn.textContent = 'Stop Recording';
      recordBtn.className = 'stop';
      status.textContent = 'Recording...';
      status.className = 'status recording';
    } else {
      recordBtn.textContent = 'Start Recording';
      recordBtn.className = 'start';
      status.textContent = 'Recording stopped';
      status.className = 'status';
    }
  }

  function downloadReport() {
    chrome.storage.local.get(['recordingData'], function(result) {
      if (result.recordingData) {
        const blob = new Blob([JSON.stringify(result.recordingData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bugcraft-report-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }
});