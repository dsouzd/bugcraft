let isRecording = false;

document.addEventListener('DOMContentLoaded', function() {
  const recordBtn = document.getElementById('recordBtn');
  const status = document.getElementById('status');

  // Check current recording state and update UI immediately
  chrome.storage.local.get(['isRecording'], function(result) {
    if (result.isRecording) {
      updateUI(true);
    }
  });

  // Listen for storage changes to update UI
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes.isRecording) {
      updateUI(changes.isRecording.newValue);
    }
  });

  recordBtn.addEventListener('click', function() {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  });

  function startRecording() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['content.js']
      }, () => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'startRecording'}, function(response) {
            if (chrome.runtime.lastError) {
              console.log('Error:', chrome.runtime.lastError.message);
              return;
            }
            if (response && (response.success || response.started)) {
              updateUI(true);
              chrome.storage.local.set({isRecording: true});
            }
          });
        }, 100);
      });
    });
  }

  function stopRecording() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopRecording'}, function(response) {
        if (chrome.runtime.lastError) {
          console.log('Error:', chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success) {
          updateUI(false);
          chrome.storage.local.set({isRecording: false});
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
      status.textContent = 'Files downloaded!';
      status.className = 'status';
    }
  }
});