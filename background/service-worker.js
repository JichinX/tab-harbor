/**
 * Tab Harbor - Service Worker
 * Core logic: shortcuts, frequent sites, settings, and keyboard shortcuts.
 * Popup and newtab communicate with this worker via chrome.runtime.sendMessage.
 */

const STORAGE_KEY = 'tab_harbor_data';
const MAX_SHORTCUTS = 20;

// ─── Default data structure ───────────────────────────────────────────────────

function getDefaultData() {
  return {
    shortcuts: [],      // Array of Shortcut | FolderShortcut
    frequentSites: [],  // Array of FrequentSite
    settings: {
      theme: 'system',         // 'dark' | 'light' | 'system' | 'auto' (sunrise/sunset)
      searchEngine: 'google',  // 'google' | 'bing' | 'baidu' | 'ddg'
    },
  };
}

// ─── Search engines ───────────────────────────────────────────────────────────

const SEARCH_ENGINES = {
  google: { label: 'Google', letter: 'G', color: '#4285F4', url: 'https://www.google.com/search?q=' },
  bing:   { label: 'Bing',   letter: 'B', color: '#00809d', url: 'https://www.bing.com/search?q=' },
  baidu:  { label: '百度',    letter: '百', color: '#306cff', url: 'https://www.baidu.com/s?wd=' },
  ddg:    { label: 'DuckDuckGo', letter: 'D', color: '#de5833', url: 'https://duckduckgo.com/?q=' },
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function loadData() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (!result[STORAGE_KEY]) {
    const data = getDefaultData();
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return data;
  }
  // Migration: ensure new fields exist
  const data = result[STORAGE_KEY];
  if (!data.shortcuts) data.shortcuts = [];
  if (!data.frequentSites) data.frequentSites = [];
  if (!data.settings) data.settings = {};
  if (!data.settings.theme) data.settings.theme = 'system';
  if (!data.settings.searchEngine) data.settings.searchEngine = 'google';
  return data;
}

async function saveData(data) {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

// ─── Shortcut helpers ─────────────────────────────────────────────────────────

/**
 * Migrate old shortcuts ({ name, url }) to new format ({ name, url, color, icon, imgUrl })
 */
function migrateShortcut(s) {
  if (s.color && s.icon !== undefined) return s; // already new format
  const domain = extractDomain(s.url);
  return {
    name: s.name,
    url: s.url,
    color: '#6366f1',
    icon: s.name ? s.name[0].toUpperCase() : domain[0].toUpperCase(),
    imgUrl: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  };
}

// ─── Shortcut CRUD ───────────────────────────────────────────────────────────

async function addShortcut(shortcut) {
  const data = await loadData();
  const totalItems = data.shortcuts.reduce((sum, s) => {
    if (s.type === 'folder') return sum + 1 + (s.children ? s.children.length : 0);
    return sum + 1;
  }, 0);
  if (totalItems >= MAX_SHORTCUTS) {
    return { success: false, message: '快捷导航已满（最多 20 个）' };
  }
  data.shortcuts.push(shortcut);
  await saveData(data);
  return { success: true };
}

async function removeShortcut(index) {
  const data = await loadData();
  if (index < 0 || index >= data.shortcuts.length) return;
  data.shortcuts.splice(index, 1);
  await saveData(data);
}

async function updateShortcutOrder(shortcuts) {
  const data = await loadData();
  data.shortcuts = shortcuts;
  await saveData(data);
}

// ─── Folder operations ────────────────────────────────────────────────────────

async function addFolder(folder) {
  const data = await loadData();
  data.shortcuts.push(folder);
  await saveData(data);
  return { success: true };
}

async function addSiteToFolder(folderIndex, site) {
  const data = await loadData();
  const folder = data.shortcuts[folderIndex];
  if (!folder || folder.type !== 'folder') return { success: false, message: '文件夹不存在' };
  if (!folder.children) folder.children = [];
  folder.children.push(site);
  await saveData(data);
  return { success: true };
}

async function removeSiteFromFolder(folderIndex, siteIndex) {
  const data = await loadData();
  const folder = data.shortcuts[folderIndex];
  if (!folder || !folder.children) return;
  folder.children.splice(siteIndex, 1);
  await saveData(data);
}

// ─── Frequent sites CRUD ─────────────────────────────────────────────────────

async function removeFrequentSite(index) {
  const data = await loadData();
  data.frequentSites.splice(index, 1);
  await saveData(data);
}

// ─── Message handler (popup/newtab <-> service worker) ─────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;

  const handler = async () => {
    switch (message.action) {
      case 'loadData': {
        const data = await loadData();
        sendResponse({ success: true, data });
        break;
      }
      // ─── Settings ───
      case 'updateSettings': {
        const data = await loadData();
        Object.assign(data.settings, message.settings);
        await saveData(data);
        sendResponse({ success: true });
        break;
      }
      // ─── Shortcuts ───
      case 'addShortcut': {
        const result = await addShortcut(message.shortcut);
        sendResponse(result);
        break;
      }
      case 'removeShortcut': {
        await removeShortcut(message.index);
        sendResponse({ success: true });
        break;
      }
      case 'updateShortcutOrder': {
        await updateShortcutOrder(message.shortcuts);
        sendResponse({ success: true });
        break;
      }
      // ─── Folders ───
      case 'addFolder': {
        const result = await addFolder(message.folder);
        sendResponse(result);
        break;
      }
      case 'addSiteToFolder': {
        const result = await addSiteToFolder(message.folderIndex, message.site);
        sendResponse(result);
        break;
      }
      case 'removeSiteFromFolder': {
        await removeSiteFromFolder(message.folderIndex, message.siteIndex);
        sendResponse({ success: true });
        break;
      }
      // ─── Frequent sites ───
      case 'removeFrequentSite': {
        await removeFrequentSite(message.index);
        sendResponse({ success: true });
        break;
      }
      // ─── Search engine ───
      case 'getSearchEngines': {
        sendResponse({ success: true, engines: SEARCH_ENGINES });
        break;
      }
      // ─── Popup: get current tab info ───
      case 'getCurrentTab': {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            sendResponse({
              success: true,
              tab: {
                title: tab.title || '',
                url: tab.url || '',
                favIconUrl: tab.favIconUrl || '',
              }
            });
          } else {
            sendResponse({ success: false });
          }
        } catch {
          sendResponse({ success: false });
        }
        break;
      }
      default:
        sendResponse({ success: false, message: '未知操作' });
    }
  };

  handler();
  return true; // 保持消息通道开启（async response）
});

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-harbor') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup/popup.html'),
      active: true,
    });
  }
});
