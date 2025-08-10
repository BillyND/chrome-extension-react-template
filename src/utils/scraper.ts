import { chromeStorage } from './chromeApi';

export interface IssueData {
  url: string;
  heading: string;
  status: string;
  originalET: string;
  originalDueDate: string;
  workingTime: string;
  timestamp: string;
}

export interface ScrapeStatus {
  total: number;
  processed: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  lastUpdate?: string;
  dataCount?: number;
}

export const CONFIG = {
  storageKey: 'jiraIssuesData',
  statusKey: 'jiraScrapeStatus',
  batchSizeKey: 'jiraBatchSize',
  batchSize: 20,
  delay: 2000,
};

export async function injectScraperScript(batchSize: number = 5): Promise<void> {
  console.log('[Popup] Starting scraper injection with batch size:', batchSize);
  
  try {
    // Check if running as extension
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      // First, get current tab info using chrome.tabs.get if we have the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        
        if (!tab || !tab.id) {
          console.error('[Popup] No active tab found');
          alert('Vui lòng mở trang Jira trước khi scrape!');
          return;
        }
        
        // Try to get full tab info including URL
        try {
          const fullTab = await chrome.tabs.get(tab.id);
          console.log('[Popup] Full tab info:', {
            id: fullTab.id,
            url: fullTab.url,
            title: fullTab.title,
            status: fullTab.status
          });
          
          // Use fullTab.url for checking
          const tabUrl = fullTab.url || tab.url;
          
          console.log('[Popup] Tab URL:', tabUrl);
        
          // Check if on Jira page
          if (!tabUrl || !tabUrl.includes('atlassian.net')) {
            alert('Vui lòng mở trang Jira issues trước khi scrape!\n\nURL hiện tại: ' + (tabUrl || 'unknown'));
            return;
          }
          
          // Send message to content script with batch size
          chrome.tabs.sendMessage(tab.id, { action: 'startScraping', batchSize: batchSize }, (response) => {
            console.log('[Popup] Response from content script:', response);
            if (chrome.runtime.lastError) {
              console.error('[Popup] Error:', chrome.runtime.lastError);
              
              // Try to inject content script if not already injected
              if (chrome.runtime.lastError.message?.includes('Could not establish connection')) {
                console.log('[Popup] Trying to inject content script...');
                chrome.scripting.executeScript({
                  target: { tabId: tab.id as number },
                  files: ['content.js']
                }, () => {
                  if (chrome.runtime.lastError) {
                    console.error('[Popup] Failed to inject script:', chrome.runtime.lastError);
                    alert('Không thể inject script. Vui lòng reload trang Jira và thử lại!');
                  } else {
                    console.log('[Popup] Content script injected, retrying...');
                    // Retry sending message
                    setTimeout(() => {
                      chrome.tabs.sendMessage(tab.id as number, { action: 'startScraping', batchSize: batchSize }, (response: unknown) => {
                        console.log('[Popup] Retry response:', response);
                      });
                    }, 500);
                  }
                });
              } else {
                alert('Lỗi: ' + chrome.runtime.lastError.message);
              }
            }
          });
        } catch (error) {
          console.error('[Popup] Error getting tab info:', error);
          // Fallback to original tab info
          console.log('[Popup] Using original tab info');
          
          // Just try to send message anyway with batch size
          chrome.tabs.sendMessage(tab.id, { action: 'startScraping', batchSize: batchSize }, (response) => {
            console.log('[Popup] Response:', response);
            if (chrome.runtime.lastError) {
              alert('Vui lòng reload trang Jira và thử lại!\n\nLỗi: ' + chrome.runtime.lastError.message);
            }
          });
        }
      });
    } else {
      // Fallback for development
      console.log('[Popup] Running in dev mode - would send message to content script');
      alert('Chức năng scraping chỉ hoạt động khi cài đặt extension!');
    }
  } catch (error) {
    console.error('[Popup] Error in injectScraperScript:', error);
    alert('Có lỗi xảy ra: ' + error);
  }
}

export async function exportData(): Promise<void> {
  const data = await chromeStorage.get(CONFIG.storageKey);
  const issues = (data[CONFIG.storageKey] as IssueData[]) || [];
  
  if (issues.length === 0) {
    alert('Không có dữ liệu để export');
    return;
  }

  // Format data nicely for export
  const formattedIssues = issues.map(issue => ({
    url: issue.url,
    title: issue.heading,
    status: issue.status,
    originalET: issue.originalET,
    originalDueDate: issue.originalDueDate,
    workingTime: issue.workingTime,
    scrapedAt: issue.timestamp
  }));

  const blob = new Blob([JSON.stringify(formattedIssues, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  a.download = `jira-issues-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  alert(`Đã export ${issues.length} issues thành công!\n\nFile: jira-issues-${dateStr}.json`);
}

export async function getStatus(): Promise<ScrapeStatus> {
  const result = await chromeStorage.get([CONFIG.statusKey, CONFIG.storageKey]);
  const status = (result[CONFIG.statusKey] as ScrapeStatus) || { total: 0, processed: 0, status: 'idle' };
  const data = (result[CONFIG.storageKey] as IssueData[]) || [];
  
  return {
    ...status,
    dataCount: data.length,
  };
}

export async function clearData(): Promise<void> {
  await chromeStorage.remove([CONFIG.storageKey, CONFIG.statusKey]);
}

export async function saveBatchSize(size: number): Promise<void> {
  await chromeStorage.set({ [CONFIG.batchSizeKey]: size });
}

export async function getBatchSize(): Promise<number> {
  const result = await chromeStorage.get(CONFIG.batchSizeKey);
  return (result[CONFIG.batchSizeKey] as number) || 5;
}