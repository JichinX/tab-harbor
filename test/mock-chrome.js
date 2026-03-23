/**
 * Chrome Extension API Mock for local testing
 * Inject before newtab.js to simulate chrome.runtime environment
 */
(function() {
  // Default mock data simulating a real user's storage
  const DEFAULT_DATA = {
    shortcuts: [
      { name: 'GitHub', url: 'https://github.com', color: '#6366f1', icon: 'G', imgUrl: 'https://toolb.cn/favicon/github.com' },
      { name: 'Google', url: 'https://www.google.com', color: '#ec4899', icon: 'G', imgUrl: 'https://toolb.cn/favicon/google.com' },
      { name: 'YouTube', url: 'https://www.youtube.com', color: '#ef4444', icon: 'Y', imgUrl: 'https://toolb.cn/favicon/youtube.com' },
      { name: 'Twitter', url: 'https://x.com', color: '#3b82f6', icon: 'X', imgUrl: 'https://toolb.cn/favicon/x.com' },
      { name: '我的博客', url: 'https://blog.example.com', color: '#10b981', icon: 'B', imgUrl: 'https://toolb.cn/favicon/blog.example.com' },
      { name: '设计工具', url: 'https://figma.com', color: '#8b5cf6', icon: 'F', imgUrl: 'https://toolb.cn/favicon/figma.com' },
      { name: '工作文件夹', type: 'folder', color: '#6366f1', children: [
        { name: 'Jira', url: 'https://jira.example.com', color: '#06b6d4', icon: 'J', imgUrl: 'https://toolb.cn/favicon/jira.example.com' },
        { name: 'Confluence', url: 'https://confluence.example.com', color: '#06b6d4', icon: 'C', imgUrl: 'https://toolb.cn/favicon/confluence.example.com' },
      ]},
    ],
    frequentSites: [
      { title: 'GitHub', url: 'github.com', color: '#6366f1', letter: 'G', freq: 28 },
      { title: 'Google', url: 'www.google.com', color: '#ec4899', letter: 'G', freq: 21 },
      { title: 'Stack Overflow', url: 'stackoverflow.com', color: '#f59e0b', letter: 'S', freq: 15 },
      { title: 'YouTube', url: 'www.youtube.com', color: '#ef4444', letter: 'Y', freq: 12 },
      { title: 'Twitter / X', url: 'x.com', color: '#3b82f6', letter: 'X', freq: 9 },
      { title: 'MDN Web Docs', url: 'developer.mozilla.org', color: '#10b981', letter: 'M', freq: 7 },
    ],
    settings: {
      theme: 'dark',
      searchEngine: 'google'
    }
  };

  let data = JSON.parse(JSON.stringify(DEFAULT_DATA));

  // Mock message handler
  function handleMessage(request, sender, sendResponse) {
    const action = request.action;

    switch (action) {
      case 'loadData':
        sendResponse({ success: true, data });
        break;

      case 'addShortcut': {
        const sc = request.shortcut;
        if (sc) {
          data.shortcuts.push(sc);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, message: '无效的快捷导航' });
        }
        break;
      }

      case 'removeShortcut': {
        if (data.shortcuts[request.index] !== undefined) {
          data.shortcuts.splice(request.index, 1);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
        break;
      }

      case 'updateShortcutOrder':
        data.shortcuts = request.shortcuts || [];
        sendResponse({ success: true });
        break;

      case 'addFolder': {
        const folder = request.folder;
        if (folder) {
          data.shortcuts.push(folder);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
        break;
      }

      case 'addSiteToFolder': {
        const fi = request.folderIndex, site = request.site;
        if (data.shortcuts[fi]?.type === 'folder') {
          data.shortcuts[fi].children.push(site);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
        break;
      }

      case 'removeSiteFromFolder': {
        const fsi = request.folderIndex, si = request.siteIndex;
        if (data.shortcuts[fsi]?.children?.[si] !== undefined) {
          data.shortcuts[fsi].children.splice(si, 1);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
        break;
      }

      case 'removeFrequentSite': {
        if (data.frequentSites[request.index] !== undefined) {
          data.frequentSites.splice(request.index, 1);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
        break;
      }

      case 'recordFrequentVisit': {
        const url = request.url;
        const existing = data.frequentSites.find(s => s.url === url || s.url === new URL(url).hostname);
        if (existing) {
          existing.freq = Math.min(99, existing.freq + 1);
        } else if (data.frequentSites.length < 30) {
          data.frequentSites.unshift({
            title: request.title || new URL(url).hostname,
            url: new URL(url).hostname.replace(/^www\./, ''),
            color: '#6366f1',
            letter: (request.title || 'S')[0].toUpperCase(),
            freq: 1
          });
        }
        sendResponse({ success: true });
        break;
      }

      case 'updateSettings':
        if (request.settings) {
          data.settings = { ...data.settings, ...request.settings };
        }
        sendResponse({ success: true });
        break;

      case 'getSearchEngines':
        sendResponse({ success: true, engines: [
          { key: 'google', name: 'Google', url: 'https://www.google.com/search?q=', letter: 'G', color: '#4285F4' },
          { key: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=', letter: 'B', color: '#00809d' },
          { key: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=', letter: '百', color: '#306cff' },
          { key: 'ddg', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', letter: 'D', color: '#de5833' }
        ]});
        break;

      case 'getCurrentTab':
        sendResponse({ success: true, tab: {
          id: 1,
          title: 'GitHub · Where software is built',
          url: 'https://github.com',
          favIconUrl: 'https://toolb.cn/favicon/github.com'
        }});
        break;

      default:
        sendResponse({ success: false, message: 'Unknown action: ' + action });
    }

    return true; // Keep channel open for async
  }

  // Inject chrome mock
  window.chrome = {
    runtime: {
      sendMessage: function(message, callback) {
        if (!callback) return;
        // Simulate async
        setTimeout(() => handleMessage(message, {}, callback), 10);
      },
      lastError: undefined,
      getURL: function(path) { return '/' + path; }
    },
    storage: {
      local: {
        get: function(keys, callback) {
          const result = {};
          if (Array.isArray(keys)) {
            keys.forEach(k => { if (data[k] !== undefined) result[k] = data[k]; });
          } else if (typeof keys === 'string') {
            if (data[keys] !== undefined) result[keys] = data[keys];
          }
          callback?.(result);
        },
        set: function(items, callback) {
          Object.assign(data, items);
          callback?.();
        }
      }
    }
  };

  console.log('[Mock] Chrome Extension API mock loaded');
})();
