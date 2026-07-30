// Popup script for HTML to Markdown Converter (i18n enabled)

let currentTitle = 'page';
let currentUrl = '';
let currentHtml = '';
let currentMarkdown = '';
let currentMode = 'article';

function getI18nMsg(key, fallback, placeholders = []) {
  if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
    const msg = chrome.i18n.getMessage(key, placeholders);
    if (msg) return msg;
  }
  return fallback;
}

const DEFAULT_SETTINGS = {
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
  gfm: true,
  keepImages: true
};

let userSettings = { ...DEFAULT_SETTINGS };

document.addEventListener('DOMContentLoaded', async () => {
  localizeUI();
  initEventListeners();
  await loadSettings();
  await checkActiveTabAndConvert();
});

function localizeUI() {
  // Elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = getI18nMsg(key, el.textContent);
    if (msg) el.textContent = msg;
  });

  // Elements with data-i18n-title
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const msg = getI18nMsg(key, el.getAttribute('title'));
    if (msg) el.setAttribute('title', msg);
  });

  // Elements with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const msg = getI18nMsg(key, el.getAttribute('placeholder'));
    if (msg) el.setAttribute('placeholder', msg);
  });
}

function initEventListeners() {
  // Mode picker dropdown toggle in header
  const btnModePicker = document.getElementById('btnModePicker');
  const dropdownMenu = document.getElementById('modeDropdownMenu');

  if (btnModePicker && dropdownMenu) {
    btnModePicker.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShow = dropdownMenu.classList.toggle('show');
      btnModePicker.classList.toggle('active', isShow);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown-wrapper')) {
        dropdownMenu.classList.remove('show');
        btnModePicker.classList.remove('active');
      }
    });
  }

  // Mode selection buttons inside dropdown
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.currentTarget.getAttribute('data-mode');
      if (dropdownMenu) {
        dropdownMenu.classList.remove('show');
        if (btnModePicker) btnModePicker.classList.remove('active');
      }
      switchMode(mode);
    });
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Settings inputs change
  ['headingStyle', 'codeBlockStyle', 'bulletListMarker', 'hr', 'gfm', 'keepImages'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        saveSettingsFromUI();
        convertHtmlToMarkdown();
      });
    }
  });

  // Reset settings
  document.getElementById('btnResetSettings').addEventListener('click', () => {
    userSettings = { ...DEFAULT_SETTINGS };
    applySettingsToUI();
    chrome.storage.sync.set(userSettings, () => {
      convertHtmlToMarkdown();
      showToast(getI18nMsg('toastReset', 'Settings reset'));
    });
  });

  // Action Buttons
  document.getElementById('btnCopy').addEventListener('click', copyMarkdown);
  document.getElementById('btnDownload').addEventListener('click', downloadMarkdown);
  document.getElementById('btnGithub').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/ingesta-net/html-to-markdown' });
  });

  document.getElementById('btnSettingsToggle').addEventListener('click', () => {
    switchTab('settings');
  });

  // Textarea manual editing update
  document.getElementById('markdownOutput').addEventListener('input', (e) => {
    currentMarkdown = e.target.value;
    updateMetaCount();
    updatePreview(currentMarkdown);
  });
}

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      userSettings = items;
      applySettingsToUI();
      resolve();
    });
  });
}

function applySettingsToUI() {
  document.getElementById('headingStyle').value = userSettings.headingStyle;
  document.getElementById('codeBlockStyle').value = userSettings.codeBlockStyle;
  document.getElementById('bulletListMarker').value = userSettings.bulletListMarker;
  document.getElementById('hr').value = userSettings.hr;
  document.getElementById('gfm').checked = userSettings.gfm;
  document.getElementById('keepImages').checked = userSettings.keepImages;
}

function saveSettingsFromUI() {
  userSettings = {
    headingStyle: document.getElementById('headingStyle').value,
    codeBlockStyle: document.getElementById('codeBlockStyle').value,
    bulletListMarker: document.getElementById('bulletListMarker').value,
    hr: document.getElementById('hr').value,
    gfm: document.getElementById('gfm').checked,
    keepImages: document.getElementById('keepImages').checked
  };

  chrome.storage.sync.set(userSettings);
}

function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });

  const modeKeys = {
    article: 'modeArticle',
    selection: 'modeSelection',
    full: 'modeFull'
  };
  const key = modeKeys[mode];
  if (key) {
    const textEl = document.getElementById('activeModeText');
    if (textEl) textEl.textContent = getI18nMsg(key, mode);
  }

  fetchAndConvert();
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  if (tabName === 'editor') {
    document.getElementById('paneEditor').classList.add('active');
  } else if (tabName === 'preview') {
    document.getElementById('panePreview').classList.add('active');
    updatePreview(currentMarkdown);
  } else if (tabName === 'settings') {
    document.getElementById('paneSettings').classList.add('active');
  }
}

async function checkActiveTabAndConvert() {
  chrome.storage.local.get(['activeModeOverride'], (res) => {
    if (res.activeModeOverride) {
      currentMode = res.activeModeOverride;
      chrome.storage.local.remove(['activeModeOverride']);
      document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === currentMode);
      });
    }
    fetchAndConvert();
  });
}

async function fetchAndConvert() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      document.getElementById('markdownOutput').value = getI18nMsg('errNoTab', 'Unable to access active tab.');
      return;
    }

    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://'))) {
      document.getElementById('markdownOutput').value = getI18nMsg('errSystemPage', 'Cannot run extension on browser system pages.');
      document.getElementById('pageTitle').textContent = tab.title || getI18nMsg('systemPageTitle', 'System Page');
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/content.js']
      });
    } catch (e) {
      // Script may already be injected
    }

    chrome.tabs.sendMessage(tab.id, { action: 'getPageContent', mode: currentMode }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        document.getElementById('markdownOutput').value = getI18nMsg('errExtract', 'Failed to extract content from tab.');
        return;
      }

      const { title, url, html, hasSelection } = response.data;
      currentTitle = title || getI18nMsg('webPageFallback', 'web page');
      currentUrl = url || '';
      currentHtml = html || '';

      document.getElementById('pageTitle').textContent = currentTitle;

      const selBadge = document.getElementById('selectionBadge');
      if (hasSelection) {
        selBadge.textContent = getI18nMsg('badgeActive', 'Active');
        selBadge.classList.add('active');
      } else {
        selBadge.textContent = getI18nMsg('badgeInactive', 'Inactive');
        selBadge.classList.remove('active');
      }

      convertHtmlToMarkdown();
    });
  } catch (err) {
    document.getElementById('markdownOutput').value = 'Error: ' + err.message;
  }
}

function convertHtmlToMarkdown() {
  if (!currentHtml) {
    document.getElementById('markdownOutput').value = getI18nMsg('errNoHtml', 'No HTML content found to convert.');
    return;
  }

  if (typeof window.TurndownService === 'undefined') {
    document.getElementById('markdownOutput').value = getI18nMsg('errTurndown', 'Turndown library could not be loaded.');
    return;
  }

  try {
    const turndownService = new window.TurndownService({
      headingStyle: userSettings.headingStyle,
      hr: userSettings.hr,
      bulletListMarker: userSettings.bulletListMarker,
      codeBlockStyle: userSettings.codeBlockStyle,
      emDelimiter: userSettings.emDelimiter,
      strongDelimiter: userSettings.strongDelimiter,
      linkStyle: 'inlined'
    });

    if (userSettings.gfm && window.turndownPluginGfm) {
      const gfmPlugin = typeof window.turndownPluginGfm === 'function'
        ? window.turndownPluginGfm
        : (window.turndownPluginGfm.gfm || window.turndownPluginGfm.default);

      if (typeof gfmPlugin === 'function' || Array.isArray(gfmPlugin)) {
        turndownService.use(gfmPlugin);
      }
    }

    if (!userSettings.keepImages) {
      turndownService.addRule('removeImages', {
        filter: ['img'],
        replacement: () => ''
      });
    }

    let markdown = turndownService.turndown(currentHtml);

    const header = `# ${currentTitle}\n\n> Source: [${currentUrl}](${currentUrl})\n\n---\n\n`;
    currentMarkdown = header + markdown;

    document.getElementById('markdownOutput').value = currentMarkdown;
    updateMetaCount();
  } catch (err) {
    document.getElementById('markdownOutput').value = 'Conversion error: ' + err.message;
  }
}

function formatCompactNum(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 10000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
}

function updateMetaCount() {
  const len = currentMarkdown.length;
  const wordCount = currentMarkdown.trim() ? currentMarkdown.trim().split(/\s+/).length : 0;
  const metaEl = document.getElementById('charCount');
  if (metaEl) {
    const formattedLen = formatCompactNum(len);
    const formattedWord = formatCompactNum(wordCount);
    metaEl.textContent = getI18nMsg('charCountFormat', `${formattedLen} chars · ${formattedWord} words`, [formattedLen, formattedWord]);
    metaEl.title = getI18nMsg('charCountTitle', `${len.toLocaleString()} characters, ${wordCount.toLocaleString()} words`, [len.toLocaleString(), wordCount.toLocaleString()]);
  }
}

function updatePreview(mdText) {
  const previewEl = document.getElementById('markdownPreview');
  if (!mdText || !mdText.trim()) {
    previewEl.innerHTML = `<p class="placeholder-text">${getI18nMsg('placeholderNoContent', 'No content to preview.')}</p>`;
    return;
  }

  let html = mdText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  previewEl.innerHTML = html;
}

function copyMarkdown() {
  if (!currentMarkdown) return;
  const copiedToast = getI18nMsg('toastCopied', 'Copied to clipboard!');
  navigator.clipboard.writeText(currentMarkdown).then(() => {
    showToast(copiedToast);
  }).catch(() => {
    const area = document.getElementById('markdownOutput');
    area.select();
    document.execCommand('copy');
    showToast(copiedToast);
  });
}

function downloadMarkdown() {
  if (!currentMarkdown) return;

  const sanitizedTitle = currentTitle
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'page';

  const filename = `${sanitizedTitle}.md`;
  const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(getI18nMsg('toastDownloaded', `${filename} downloaded`, [filename]));
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}
