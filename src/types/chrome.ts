// Chrome API type definitions

export interface ChromeTab {
  id?: number;
  url?: string;
  active: boolean;
  windowId: number;
  index: number;
  pinned: boolean;
  highlighted: boolean;
  incognito: boolean;
  selected: boolean;
  discarded: boolean;
  autoDiscardable: boolean;
  groupId: number;
}

export interface ChromeTabCreateOptions {
  url: string;
  active?: boolean;
  index?: number;
  windowId?: number;
  openerTabId?: number;
  pinned?: boolean;
}

export interface ChromeTabQueryOptions {
  active?: boolean;
  currentWindow?: boolean;
  lastFocusedWindow?: boolean;
  windowId?: number;
  windowType?: 'normal' | 'popup' | 'panel' | 'app' | 'devtools';
  index?: number;
  title?: string;
  url?: string | string[];
  status?: 'loading' | 'complete';
  pinned?: boolean;
  audible?: boolean;
  muted?: boolean;
  highlighted?: boolean;
  discarded?: boolean;
  autoDiscardable?: boolean;
  groupId?: number;
}

export interface ChromeScriptInjection {
  target: {
    tabId: number;
    frameIds?: number[];
    allFrames?: boolean;
  };
  func?: () => void;
  files?: string[];
  args?: unknown[];
  injectImmediately?: boolean;
  world?: 'ISOLATED' | 'MAIN';
}

export interface ChromeStorageItems {
  [key: string]: unknown;
}

export interface IssueLink {
  url: string;
  href?: string;
  index: number;
  processed: boolean;
}