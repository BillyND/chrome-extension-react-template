// Chrome API wrapper with fallback for development

import { 
  ChromeTab, 
  ChromeTabCreateOptions, 
  ChromeTabQueryOptions, 
  ChromeScriptInjection,
  ChromeStorageItems 
} from '@/types/chrome';

class ChromeStorageAPI {
  private isExtension = typeof chrome !== 'undefined' && chrome.storage;

  async get(keys: string | string[]): Promise<ChromeStorageItems> {
    if (this.isExtension) {
      return chrome.storage.local.get(keys);
    } else {
      // Fallback to localStorage for development
      const result: ChromeStorageItems = {};
      const keyArray = Array.isArray(keys) ? keys : [keys];
      
      keyArray.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      });
      
      return result;
    }
  }

  async set(items: ChromeStorageItems): Promise<void> {
    if (this.isExtension) {
      return chrome.storage.local.set(items);
    } else {
      // Fallback to localStorage for development
      Object.entries(items).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
    }
  }

  async remove(keys: string | string[]): Promise<void> {
    if (this.isExtension) {
      return chrome.storage.local.remove(keys);
    } else {
      // Fallback to localStorage for development
      const keyArray = Array.isArray(keys) ? keys : [keys];
      keyArray.forEach(key => localStorage.removeItem(key));
    }
  }

  async clear(): Promise<void> {
    if (this.isExtension) {
      return chrome.storage.local.clear();
    } else {
      localStorage.clear();
    }
  }
}

class ChromeTabsAPI {
  private isExtension = typeof chrome !== 'undefined' && chrome.tabs;

  async create(options: ChromeTabCreateOptions): Promise<void> {
    if (this.isExtension) {
      await chrome.tabs.create(options);
    } else {
      // Fallback to window.open for development
      window.open(options.url, '_blank');
    }
  }

  async query(options: ChromeTabQueryOptions): Promise<ChromeTab[]> {
    if (this.isExtension) {
      return chrome.tabs.query(options) as Promise<ChromeTab[]>;
    } else {
      // Return mock tab for development
      return [{
        id: 1,
        url: window.location.href,
        active: true,
        windowId: 1,
        index: 0,
        pinned: false,
        highlighted: true,
        incognito: false,
        selected: true,
        discarded: false,
        autoDiscardable: true,
        groupId: -1
      }];
    }
  }
}

class ChromeScriptingAPI {
  private isExtension = typeof chrome !== 'undefined' && chrome.scripting;

  async executeScript(options: ChromeScriptInjection): Promise<void> {
    if (this.isExtension) {
      await chrome.scripting.executeScript(options as chrome.scripting.ScriptInjection<[], void>);
    } else {
      // For development, just log the action
      console.log('Would execute script:', options);
      // Try to execute the function directly if possible
      if (options.func) {
        try {
          options.func();
        } catch (error) {
          console.error('Error executing script in dev mode:', error);
        }
      }
    }
  }
}

// Export singleton instances
export const chromeStorage = new ChromeStorageAPI();
export const chromeTabs = new ChromeTabsAPI();
export const chromeScripting = new ChromeScriptingAPI();

// Helper to check if running as extension
export const isExtensionEnvironment = (): boolean => {
  return typeof chrome !== 'undefined' && chrome.storage !== undefined;
};