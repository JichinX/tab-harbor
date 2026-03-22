/**
 * Tab Harbor Popup — Add to Shortcuts
 * Lightweight form: get current tab → detect duplicate → pick icon/color/folder → add shortcut.
 * All data operations via chrome.runtime.sendMessage → Service Worker.
 */

/* ── Constants ── */
const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#06b6d4','#f97316','#000'];

/* ── Helpers ── */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function msg(action, extra = {}) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action, ...extra }, r => {
      if (chrome.runtime.lastError) { resolve({ success: false }); return; }
      resolve(r || { success: false });
    });
  });
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function domain(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }
function isValidDomain(u) { return /^https?:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+([\/?#].*)?$/i.test(u); }
const DEFAULT_FAVICON_API = 'https://icons.duckduckgo.com/ip3/{domain}.ico';
let faviconApiUrl = DEFAULT_FAVICON_API;
function faviconUrl(url) { if (!faviconApiUrl) return ''; try { return faviconApiUrl.replace('{domain}', new URL(url).hostname); } catch { return ''; } }

function showToast(m) {
  const t = $('#toast'); t.textContent = m; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ── State ── */
let selColor = COLORS[1];
let iconMode = 'auto'; // 'auto' | 'custom' | 'url'
let customVal = '';
let customUrlVal = '';
let iconLoadOk = null; // null=pending, true=ok, false=failed
let targetFolder = -1; // -1 = root (no folder), >=0 = folder index in shortcuts
let appData = null;
let currentTab = null;

/* ── DOM refs ── */
const favicon = $('#favicon');
const pTitle = $('#pTitle');
const pUrl = $('#pUrl');
const existsHint = $('#existsHint');
const iconPreview = $('#iconPreview');
const autoBtn = $('#autoBtn');
const customBtn = $('#customBtn');
const urlBtn = $('#urlBtn');
const customFg = $('#customFg');
const customIcon = $('#customIcon');
const urlFg = $('#urlFg');
const iconUrl = $('#iconUrl');
const iconUrlStatus = $('#iconUrlStatus');
const autoStatus = $('#autoStatus');
const autoUrlStatus = $('#autoUrlStatus');
const siteName = $('#siteName');
const siteUrl = $('#siteUrl');
const colorsEl = $('#colors');
const targetsEl = $('#targets');
const addBtn = $('#addBtn');
const cancelBtn = $('#cancelBtn');

/* ── Theme: apply from stored settings ── */
async function applyTheme() {
  const r = await msg('loadData');
  if (r.success && r.data && r.data.settings) {
    const m = r.data.settings.theme || 'system';
    let eff;
    if (m === 'dark' || m === 'light') eff = m;
    else if (m === 'system') eff = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    else { const h = new Date().getHours(); eff = (h >= 6 && h < 18) ? 'light' : 'dark'; }
    document.documentElement.setAttribute('data-theme', eff);
  }
}

/* ── Icon Preview with load detection ── */
let _imgTest = null;
function updatePreview() {
  const name = siteName.value.trim();
  const url = siteUrl.value.trim();
  iconPreview.style.background = selColor;
  iconPreview.style.backgroundImage = '';
  iconPreview.innerHTML = '';
  iconPreview.className = 'icon-preview';
  iconLoadOk = null;
  if (_imgTest) { _imgTest.onload = null; _imgTest.onerror = null; _imgTest = null; }

  // Auto status display
  if (iconMode === 'auto') {
    const img = faviconUrl(url);
    autoStatus.classList.remove('hidden');
    if (!url || !isValidDomain(url.startsWith('http') ? url : 'https://' + url)) {
      autoUrlStatus.textContent = url ? '网址格式不正确' : '请输入网址后自动获取';
      autoUrlStatus.className = 'icon-url-status icon-url-status--fail';
      iconLoadOk = false;
      iconPreview.innerHTML = name ? esc(name[0].toUpperCase()) : 'A';
    } else if (img) {
      autoUrlStatus.textContent = img;
      autoUrlStatus.className = 'icon-url-status icon-url-status--pending';
      // Show spinner while loading
      iconPreview.innerHTML = '<div class="icon-spinner"></div>';
      iconPreview.className = 'icon-preview';
      _imgTest = new Image();
      _imgTest.onload = () => {
        iconLoadOk = true;
        autoUrlStatus.className = 'icon-url-status icon-url-status--ok';
        iconPreview.style.backgroundImage = `url(${img})`;
        iconPreview.innerHTML = '';
        iconPreview.className = 'icon-preview has-img';
      };
      _imgTest.onerror = () => {
        iconLoadOk = false;
        autoUrlStatus.textContent = '自动获取失败，请使用自定义地址';
        autoUrlStatus.className = 'icon-url-status icon-url-status--fail';
        iconPreview.innerHTML = name ? esc(name[0].toUpperCase()) : 'A';
        iconPreview.className = 'icon-preview';
      };
      setTimeout(() => {
        if (iconLoadOk === null) {
          iconLoadOk = false;
          autoUrlStatus.textContent = '自动获取超时，请使用自定义地址';
          autoUrlStatus.className = 'icon-url-status icon-url-status--fail';
          iconPreview.innerHTML = name ? esc(name[0].toUpperCase()) : 'A';
          iconPreview.className = 'icon-preview';
        }
      }, 5000);
      _imgTest.src = img;
    } else {
      autoUrlStatus.textContent = '请输入网址后自动获取';
      autoUrlStatus.className = 'icon-url-status icon-url-status--pending';
      iconPreview.innerHTML = name ? esc(name[0].toUpperCase()) : 'A';
    }
  } else if (iconMode === 'custom' && customVal) {
    autoStatus.classList.add('hidden');
    iconPreview.innerHTML = esc(customVal);
  } else if (iconMode === 'url' && customUrlVal) {
    autoStatus.classList.add('hidden');
    iconUrlStatus.classList.remove('hidden');
    iconUrlStatus.textContent = customUrlVal;
    iconUrlStatus.className = 'icon-url-status icon-url-status--pending';
    // Show spinner while loading
    iconPreview.innerHTML = '<div class="icon-spinner"></div>';
    iconPreview.className = 'icon-preview';
    _imgTest = new Image();
    _imgTest.onload = () => {
      iconLoadOk = true;
      iconUrlStatus.className = 'icon-url-status icon-url-status--ok';
      iconPreview.style.backgroundImage = `url(${customUrlVal})`;
      iconPreview.innerHTML = '';
      iconPreview.className = 'icon-preview has-img';
    };
    _imgTest.onerror = () => {
      iconLoadOk = false;
      iconUrlStatus.textContent = '图标加载失败，请检查地址';
      iconUrlStatus.className = 'icon-url-status icon-url-status--fail';
      iconPreview.innerHTML = name ? esc(name[0].toUpperCase()) : 'A';
      iconPreview.className = 'icon-preview';
    };
    _imgTest.src = customUrlVal;
  } else {
    autoStatus.classList.add('hidden');
    iconPreview.innerHTML = name ? esc(name[0].toUpperCase()) : 'A';
  }
}

/* ── Duplicate Detection ── */
function checkDuplicate(url) {
  if (!url || !appData) return;
  const d = domain(url);
  if (!d) { existsHint.classList.add('hidden'); return; }

  // Check root-level shortcuts
  const found = appData.shortcuts.some(s => {
    if (s.type === 'folder' && s.children) {
      return s.children.some(c => domain(c.url) === d);
    }
    return s.url && domain(s.url) === d;
  });

  if (found) existsHint.classList.remove('hidden');
  else existsHint.classList.add('hidden');
}

/* ── Color Picker ── */
function renderColors() {
  colorsEl.innerHTML = COLORS.map(c =>
    `<div class="co${c === selColor ? ' sel' : ''}" style="background:${c}" data-c="${c}"></div>`
  ).join('');
  colorsEl.querySelectorAll('.co').forEach(el => el.addEventListener('click', () => {
    selColor = el.dataset.c;
    colorsEl.querySelectorAll('.co').forEach(x => x.classList.remove('sel'));
    el.classList.add('sel');
    updatePreview();
  }));
}

/* ── Folder Targets ── */
function renderTargets() {
  if (!appData) return;
  const folders = appData.shortcuts.filter(s => s.type === 'folder');
  let html = `<div class="tg${targetFolder === -1 ? ' sel' : ''}" data-i="-1">快捷导航</div>`;
  folders.forEach((f, i) => {
    const idx = appData.shortcuts.indexOf(f);
    html += `<div class="tg${targetFolder === idx ? ' sel' : ''}" data-i="${idx}">${esc(f.name)}</div>`;
  });
  targetsEl.innerHTML = html;
  targetsEl.querySelectorAll('.tg').forEach(el => el.addEventListener('click', () => {
    targetFolder = parseInt(el.dataset.i);
    targetsEl.querySelectorAll('.tg').forEach(x => x.classList.remove('sel'));
    el.classList.add('sel');
  }));
}

/* ── Icon Mode Toggle ── */
autoBtn.addEventListener('click', () => {
  iconMode = 'auto'; customVal = ''; customUrlVal = '';
  autoBtn.classList.add('on'); customBtn.classList.remove('on'); urlBtn.classList.remove('on');
  customFg.classList.add('hidden'); urlFg.classList.add('hidden');
  iconUrlStatus.classList.add('hidden');
  updatePreview();
});

customBtn.addEventListener('click', () => {
  iconMode = 'custom';
  customBtn.classList.add('on'); autoBtn.classList.remove('on'); urlBtn.classList.remove('on');
  customFg.classList.remove('hidden'); urlFg.classList.add('hidden');
  autoStatus.classList.add('hidden'); iconUrlStatus.classList.add('hidden');
  customIcon.focus();
});

urlBtn.addEventListener('click', () => {
  iconMode = 'url'; customVal = '';
  urlBtn.classList.add('on'); autoBtn.classList.remove('on'); customBtn.classList.remove('on');
  urlFg.classList.remove('hidden'); customFg.classList.add('hidden');
  autoStatus.classList.add('hidden');
  iconUrl.focus();
});

customIcon.addEventListener('input', e => { customVal = e.target.value; updatePreview(); });
iconUrl.addEventListener('input', e => { customUrlVal = e.target.value.trim(); updatePreview(); });
siteName.addEventListener('input', updatePreview);
siteUrl.addEventListener('input', () => { updatePreview(); checkDuplicate(siteUrl.value.trim()); });

/* ── Add Shortcut ── */
addBtn.addEventListener('click', async () => {
  const name = siteName.value.trim();
  const url = siteUrl.value.trim();
  if (!name || !url) { showToast('请填写名称和网址'); return; }

  // Build shortcut object
  const d = domain(url);
  let imgUrl = '';
  let icon = (name[0] || d[0] || 'A').toUpperCase();
  if (iconMode === 'custom' && customVal) {
    icon = customVal;
    imgUrl = '';
  } else if (iconMode === 'url' && customUrlVal && iconLoadOk !== false) {
    imgUrl = customUrlVal;
  } else if (iconMode === 'auto' && iconLoadOk === true) {
    imgUrl = faviconUrl(url);
  } else {
    imgUrl = '';
  }
  const shortcut = {
    name,
    url,
    color: selColor,
    icon,
    imgUrl,
  };

  if (targetFolder >= 0 && appData && appData.shortcuts[targetFolder] && appData.shortcuts[targetFolder].type === 'folder') {
    // Add to folder
    const r = await msg('addSiteToFolder', { folderIndex: targetFolder, site: shortcut });
    if (r.success) { showToast(`已添加到 ${appData.shortcuts[targetFolder].name}`); window.close?.(); }
    else showToast(r.message || '添加失败');
  } else {
    // Add to root
    const r = await msg('addShortcut', { shortcut });
    if (r.success) { showToast('已添加到快捷导航'); window.close?.(); }
    else showToast(r.message || '添加失败');
  }
});

/* ── Cancel ── */
cancelBtn.addEventListener('click', () => window.close?.());

/* ── Enter key to submit ── */
siteUrl.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });
siteName.addEventListener('keydown', e => { if (e.key === 'Enter') siteUrl.focus(); });

/* ── Init ── */
(async () => {
  await applyTheme();

  // Get current tab info
  const tabResult = await msg('getCurrentTab');
  if (tabResult.success && tabResult.tab) {
    currentTab = tabResult.tab;
    const d = domain(currentTab.url);
    favicon.src = d ? `https://icons.duckduckgo.com/ip3/${d}.ico` : '';
    favicon.onerror = () => { favicon.style.display = 'none'; };
    pTitle.textContent = currentTab.title || '未知页面';
    pUrl.textContent = d || currentTab.url;
    siteName.value = currentTab.title || d || '';
    try { siteUrl.value = new URL(currentTab.url).origin; } catch { siteUrl.value = currentTab.url || ''; }
  } else {
    pTitle.textContent = '无法获取页面信息';
    pUrl.textContent = '';
  }

  // Load app data for duplicate check and folder list
  const dataResult = await msg('loadData');
  if (dataResult.success && dataResult.data) {
    appData = dataResult.data;
    if (appData.settings?.faviconApi) faviconApiUrl = appData.settings.faviconApi;
    checkDuplicate(siteUrl.value.trim());
  }

  // Pick a default color based on domain hash
  if (currentTab && currentTab.url) {
    const d = domain(currentTab.url);
    if (d) {
      let hash = 0;
      for (let i = 0; i < d.length; i++) hash = d.charCodeAt(i) + ((hash << 5) - hash);
      selColor = COLORS[Math.abs(hash) % COLORS.length];
    }
  }

  renderColors();
  renderTargets();
  updatePreview();
})();
