/**
 * Tab Harbor - Service Worker
 * Core logic: shortcuts, frequent sites, settings, and keyboard shortcuts.
 * Popup and newtab communicate with this worker via chrome.runtime.sendMessage.
 */

const STORAGE_KEY = 'tab_harbor_data';
const MAX_SHORTCUTS = 20;
const MAX_FREQUENT = 30;
const SKIP_DOMAINS = ['chrome-extension://', 'chrome://', 'chrome-newtab://', 'about:blank', 'localhost'];
const SKIP_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.zip', '.rar', '.mp4', '.mp3'];

// ─── Default data structure ───────────────────────────────────────────────────

function getDefaultData() {
  return {
    shortcuts: [],      // Array of Shortcut | FolderShortcut
    frequentSites: [],  // Array of FrequentSite
    settings: {
      theme: 'system',         // 'dark' | 'light' | 'system' | 'auto' (sunrise/sunset)
      searchEngine: 'google',  // 'google' | 'bing' | 'baidu' | 'ddg'
      faviconApi: '',          // custom favicon API URL, empty = use default (ToolB.cn)
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
  if (!data.settings.faviconApi) data.settings.faviconApi = '';
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
    imgUrl: `https://toolb.cn/favicon/${domain}`,
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

// ─── Frequent sites ──────────────────────────────────────────────────────

/**
 * Scrape chrome.history for the given period, count visit frequency per domain.
 * @param {Object} options
 * @param {'week'|'month'|'year'} [options.period='week'] - Time range for history search
 * @param {number} [options.maxTop=30] - Max number of sites to return
 */
async function refreshFrequentSites({ period = 'week', maxTop = 30 } = {}) {
  try {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const daysMap = { week: 7, month: 30, year: 365 };
    const days = daysMap[period] || 7;
    const startTime = now - days * DAY;

    const items = await chrome.history.search({
      text: '',
      startTime,
      endTime: now,
      maxResults: 10000,
    });

    // Aggregate visit count by domain
    const domainMap = {};
    for (const item of items) {
      if (!item.url || !item.visitCount) continue;
      // Skip non-http schemes
      if (!item.url.startsWith('http://') && !item.url.startsWith('https://')) continue;
      // Skip file downloads
      if (SKIP_EXTENSIONS.some(ext => item.url.toLowerCase().includes(ext) && item.url.split(ext)[1] === '')) continue;

      const domain = extractDomain(item.url);
      if (domain === 'unknown' || domain.length < 3) continue;

      if (!domainMap[domain]) {
        domainMap[domain] = { domain, title: item.title || domain, count: 0 };
      }
      // visitCount is total all-time; we use it as an approximation since
      // chrome.history.search doesn't provide per-range counts directly.
      domainMap[domain].count += item.visitCount || 1;
      // Prefer shorter/cleaner title
      if (item.title && item.title.length < (domainMap[domain].title || '').length) {
        domainMap[domain].title = item.title;
      }
    }

    // Get shortcuts to exclude them from frequent list
    const data = await loadData();
    const shortcutDomains = new Set();
    for (const s of data.shortcuts || []) {
      if (s.type === 'folder') {
        (s.children || []).forEach(c => { if (c.url) shortcutDomains.add(extractDomain(c.url)); });
      } else if (s.url) {
        shortcutDomains.add(extractDomain(s.url));
      }
    }

    // Sort by count desc, take top maxTop
    const limit = Math.max(5, Math.min(maxTop, 100));
    const sorted = Object.values(domainMap)
      .filter(d => !shortcutDomains.has(d.domain))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    // Convert to FrequentSite format
    const freqLabel = { week: '次/周', month: '次/月', year: '次/年' }[period] || '次/周';
    const maxCount = sorted.length ? sorted[0].count : 1;
    const freqScale = days <= 7 ? 50 : days <= 30 ? 100 : 300;
    const frequentSites = sorted.map(d => ({
      url: d.domain,
      title: d.title || d.domain,
      letter: (d.title || d.domain)[0].toUpperCase(),
      color: generateColor(d.domain),
      freq: Math.max(1, Math.round((d.count / maxCount) * freqScale)),
    }));

    // Store freqLabel so UI can display the correct unit
    data.frequentSites = frequentSites;
    data.frequentSitesMeta = { period, freqLabel };
    await saveData(data);
    return { sites: frequentSites, period, freqLabel };
  } catch (e) {
    console.error('refreshFrequentSites failed:', e);
    return { sites: [], period, freqLabel: '' };
  }
}

/** Deterministic color from domain string */
function generateColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const palette = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#06b6d4','#f97316','#14b8a6'];
  return palette[Math.abs(hash) % palette.length];
}

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
        updateBadge();
        break;
      }
      case 'removeShortcut': {
        await removeShortcut(message.index);
        sendResponse({ success: true });
        updateBadge();
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
        updateBadge();
        break;
      }
      case 'removeSiteFromFolder': {
        await removeSiteFromFolder(message.folderIndex, message.siteIndex);
        sendResponse({ success: true });
        updateBadge();
        break;
      }
      // ─── Frequent sites ───
      case 'removeFrequentSite': {
        await removeFrequentSite(message.index);
        sendResponse({ success: true });
        break;
      }
      case 'refreshFrequentSites': {
        const result = await refreshFrequentSites({
          period: message.period || 'week',
          maxTop: message.maxTop || 30,
        });
        sendResponse({ success: true, sites: result.sites, period: result.period, freqLabel: result.freqLabel });
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

// ─── Badge: indicate if current tab is already in shortcuts ────────────────────

async function updateBadge() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }
    const d = extractDomain(tab.url);
    const data = await loadData();
    const found = data.shortcuts.some(s => {
      if (s.type === 'folder' && s.children) {
        return s.children.some(c => extractDomain(c.url) === d);
      }
      return s.url && extractDomain(s.url) === d;
    });
    if (found) {
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
      chrome.action.setBadgeText({ text: '✓' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Update badge when active tab changes
chrome.tabs.onActivated.addListener(() => updateBadge());

// Update badge when current tab finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab && tab.id === tabId) updateBadge();
    });
  }
});
