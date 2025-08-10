// Content script for Jira pages
console.log('[Sync Jira Work] Content script loaded');

// Configuration
let CONFIG = {
  storageKey: 'jiraIssuesData',
  statusKey: 'jiraScrapeStatus',
  batchSize: 5, // Default, will be updated from popup
  delay: 2000,
};

// Get issue links from list page
function getIssueLinks() {
  console.log('[Sync Jira Work] Getting issue links...');
  
  // Try multiple selectors for Jira
  const selectors = [
    '[data-testid="issue-navigator.ui.issue-results.detail-view.card-list.card"]',
    '[data-testid="issue-navigator.ui.issue-results.detail-view.card.card"]',
    '.issue-list .issue-link',
    'a[href*="/browse/"]'
  ];
  
  let cards = null;
  for (const selector of selectors) {
    cards = document.querySelectorAll(selector);
    if (cards.length > 0) {
      console.log(`[Sync Jira Work] Found ${cards.length} issues with selector: ${selector}`);
      break;
    }
  }
  
  if (!cards || cards.length === 0) {
    console.error('[Sync Jira Work] No issue cards found');
    return [];
  }
  
  const links = [];
  cards.forEach((card, index) => {
    let url = '';
    if (card.tagName === 'A') {
      url = card.href;
    } else {
      const anchor = card.querySelector('a');
      if (anchor) {
        url = anchor.href;
      }
    }
    
    if (url && url.includes('/browse/')) {
      links.push({
        url: url,
        index: index,
        processed: false,
      });
    }
  });
  
  console.log(`[Sync Jira Work] Found ${links.length} valid issue links`);
  return links;
}

// Scrape issue detail from detail page
function scrapeIssueDetail() {
  console.log('[Sync Jira Work] Scraping issue detail...');
  
  // Try multiple selectors for issue title
  const titleSelectors = [
    '[data-testid="issue.views.issue-base.foundation.summary.heading"]',
    'h1[data-testid*="summary"]',
    'h1',
    '.issue-header h1'
  ];
  
  let heading = null;
  for (const selector of titleSelectors) {
    heading = document.querySelector(selector);
    if (heading) {
      console.log(`[Sync Jira Work] Found heading with selector: ${selector}`);
      break;
    }
  }
  
  // Get status
  let status = '';
  const statusElement = document.querySelector('[data-testid="issue-field-status.ui.status-view.status-button.status-button"]');
  if (statusElement) {
    status = statusElement.textContent.trim();
    console.log(`[Sync Jira Work] Found status: ${status}`);
  }
  
  // Get Original ET (Points)
  let originalET = '';
  const etElement = document.querySelector('[data-testid="issue-field-story-point-estimate-readview-full.ui.story-point-estimate.badge"]');
  if (etElement) {
    originalET = etElement.textContent.trim();
    console.log(`[Sync Jira Work] Found Original ET: ${originalET}`);
  }
  
  // Get Original Due Date
  let originalDueDate = '';
  const dueDateElement = document.querySelector('[data-testid="coloured-due-date.ui.tooltip-container"]');
  if (dueDateElement) {
    originalDueDate = dueDateElement.textContent.trim();
    console.log(`[Sync Jira Work] Found Original Due Date: ${originalDueDate}`);
  }
  
  // Get Working Time
  let workingTime = '';
  const workingTimeElement = document.querySelector('[data-testid="issue.issue-view.common.logged-time.value"]');
  if (workingTimeElement) {
    workingTime = workingTimeElement.textContent.trim();
    console.log(`[Sync Jira Work] Found Working Time: ${workingTime}`);
  }
  
  const data = {
    url: window.location.href,
    heading: heading ? heading.textContent.trim() : 'No title found',
    status: status || 'N/A',
    originalET: originalET || 'N/A',
    originalDueDate: originalDueDate || 'N/A',
    workingTime: workingTime || 'N/A',
    timestamp: new Date().toISOString(),
  };
  
  console.log('[Sync Jira Work] Scraped data:', data);
  return data;
}

// Process links in batches
async function processInBatches(links) {
  console.log(`[Sync Jira Work] Processing ${links.length} links in batches...`);
  
  for (let i = 0; i < links.length; i += CONFIG.batchSize) {
    const batch = links.slice(i, i + CONFIG.batchSize);
    console.log(`[Sync Jira Work] Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}`);
    
    batch.forEach((link) => {
      const url = link.url.includes('?')
        ? `${link.url}&autoScrape=true`
        : `${link.url}?autoScrape=true`;
      
      console.log(`[Sync Jira Work] Opening: ${url}`);
      window.open(url, '_blank');
    });
    
    // Wait before next batch
    if (i + CONFIG.batchSize < links.length) {
      console.log(`[Sync Jira Work] Waiting ${CONFIG.delay + batch.length * 3000}ms before next batch...`);
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.delay + batch.length * 3000)
      );
    }
  }
  
  console.log('[Sync Jira Work] All batches processed');
}

// Handle detail page (when opened with autoScrape param)
function handleDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autoScrape') !== 'true') {
    console.log('[Sync Jira Work] Not auto-scraping this page');
    return;
  }
  
  console.log('[Sync Jira Work] Auto-scraping detail page...');
  
  // Wait for page to load
  setTimeout(() => {
    const data = scrapeIssueDetail();
    
    // Send data to background script
    chrome.runtime.sendMessage({ 
      action: 'saveIssueData', 
      data: data 
    }, (response) => {
      console.log('[Sync Jira Work] Data saved:', response);
      
      // Close tab after saving
      setTimeout(() => {
        console.log('[Sync Jira Work] Closing tab...');
        window.close();
      }, 500);
    });
  }, 2000);
}

// Handle list page
function handleListPage(batchSize) {
  console.log('[Sync Jira Work] Handling list page with batch size:', batchSize);
  
  // Update config with new batch size
  if (batchSize && batchSize > 0 && batchSize <= 20) {
    CONFIG.batchSize = batchSize;
  }
  
  const links = getIssueLinks();
  
  if (links.length === 0) {
    alert('Không tìm thấy issues nào trên trang này!');
    return;
  }
  
  if (confirm(`Tìm thấy ${links.length} issues.\nSẽ xử lý ${CONFIG.batchSize} issues mỗi lần.\nBắt đầu scraping?`)) {
    // Send start message to background
    chrome.runtime.sendMessage({ 
      action: 'startScraping',
      total: links.length 
    }, (response) => {
      console.log('[Sync Jira Work] Started scraping:', response);
      console.log(`[Sync Jira Work] Processing ${links.length} links with batch size ${CONFIG.batchSize}`);
      processInBatches(links);
    });
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Sync Jira Work] Received message:', request);
  
  if (request.action === 'startScraping') {
    const batchSize = request.batchSize || CONFIG.batchSize;
    handleListPage(batchSize);
    sendResponse({ success: true });
  } else if (request.action === 'getIssueCount') {
    const links = getIssueLinks();
    sendResponse({ count: links.length });
  }
  
  return true; // Keep channel open for async response
});

// Check current page type on load
function initContentScript() {
  const currentUrl = window.location.href;
  console.log('[Sync Jira Work] Current URL:', currentUrl);
  
  // Check if detail page with autoScrape
  if (currentUrl.includes('/browse/') && !currentUrl.includes('/issues')) {
    handleDetailPage();
  } else {
    console.log('[Sync Jira Work] Ready on list page');
    
    // Make function available globally for testing
    window.syncJiraWork = {
      getIssueLinks,
      handleListPage,
      scrapeIssueDetail
    };
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}

console.log('[Sync Jira Work] Content script setup complete');