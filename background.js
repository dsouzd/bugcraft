// Background script for handling extension lifecycle
chrome.runtime.onInstalled.addListener(() => {
  console.log('BugCraft extension installed');
});

// Clean up storage on extension startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({isRecording: false});
});