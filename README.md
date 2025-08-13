# BugCraft Chrome Extension

A Chrome extension for recording screen activity, console logs, and network transactions for debugging purposes.

## Features

- **Screen Recording**: Records the current tab's screen activity
- **Console Monitoring**: Captures all console.log, console.error, console.warn, etc.
- **Network Monitoring**: Tracks fetch/XHR requests and responses
- **Data Export**: Downloads consolidated report as JSON

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this directory
4. The BugCraft icon will appear in your extensions toolbar

## Usage

1. Click the BugCraft extension icon
2. Click "Start Recording" to begin capturing
3. Interact with your application
4. Click "Stop Recording" when done
5. Click "Download Report" to get the consolidated data

## Report Format

The exported JSON contains:
- `startTime`/`endTime`: Recording timestamps
- `url`: Page URL
- `consoleLogs`: Array of console messages with timestamps
- `networkRequests`: Array of network requests with responses
- `screenRecording`: Base64 encoded video data

## Development

To modify the extension:
1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the BugCraft extension
4. Test your changes