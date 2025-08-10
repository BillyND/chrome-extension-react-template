// Background script for Sync Jira Work extension
console.log('[Background] Service worker started');

const CONFIG = {
  storageKey: 'jiraIssuesData',
  statusKey: 'jiraScrapeStatus',
};

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request.action, 'from:', sender.tab?.url);
  
  if (request.action === 'saveIssueData') {
    saveIssueData(request.data);
    sendResponse({ success: true });
  } else if (request.action === 'startScraping') {
    startScraping(request.total);
    sendResponse({ success: true });
  } else if (request.action === 'getStatus') {
    getStatus().then(status => {
      sendResponse(status);
    });
    return true; // Keep channel open for async response
  }
});

async function saveIssueData(data) {
  const result = await chrome.storage.local.get(CONFIG.storageKey);
  const existingData = result[CONFIG.storageKey] || [];
  existingData.push(data);
  
  await chrome.storage.local.set({
    [CONFIG.storageKey]: existingData
  });
  
  // Update status
  const statusResult = await chrome.storage.local.get(CONFIG.statusKey);
  const status = statusResult[CONFIG.statusKey] || {};
  status.processed = (status.processed || 0) + 1;
  status.lastUpdate = new Date().toISOString();
  
  if (status.processed >= status.total) {
    status.status = 'completed';
  }
  
  await chrome.storage.local.set({
    [CONFIG.statusKey]: status
  });
  
  console.log('Saved issue data:', data.heading);
}

async function startScraping(total) {
  await chrome.storage.local.set({
    [CONFIG.storageKey]: [],
    [CONFIG.statusKey]: {
      total: total,
      processed: 0,
      status: 'running',
      lastUpdate: new Date().toISOString()
    }
  });
  
  console.log(`Started scraping ${total} issues`);
}

async function getStatus() {
  const result = await chrome.storage.local.get([CONFIG.statusKey, CONFIG.storageKey]);
  const status = result[CONFIG.statusKey] || { total: 0, processed: 0, status: 'idle' };
  const data = result[CONFIG.storageKey] || [];
  
  return {
    ...status,
    dataCount: data.length
  };
}

// Export data when extension icon is clicked with Alt key
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get(CONFIG.storageKey, (result) => {
    const data = result[CONFIG.storageKey] || [];
    if (data.length > 0) {
      console.log('Export data:', data);
    }
  });
});