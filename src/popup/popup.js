// Popup script for HTML to Markdown Converter

let currentTitle = 'page';
let currentUrl = '';
let currentHtml = '';
let currentMarkdown = '';
let currentMode = 'article';

const MODE_METADATA = {
  article: {
    label: 'Article',
    iconSvg: '<path d="M4 6h16M4 12h16M4 18h7"/>'
  },
  selection: {
    label: 'Sélection',
    iconSvg: '<path d="M6 3v18M18 3v18M3 6h18M3 18h18"/>'
  },
  full: {
    label: 'Page entière',
    iconSvg: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/>'
  }
};

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
  initEventListeners();
  await loadSettings();
  await checkActiveTabAndConvert();
});

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
      showToast('Paramètres réinitialisés');
    });
  });

  // Action Buttons
  document.getElementById('btnCopy').addEventListener('click', copyMarkdown);
  document.getElementById('btnDownload').addEventListener('click', downloadMarkdown);
  document.getElementById('btnGithub').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/your-username/html-to-markdown-extension' });
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

  const meta = MODE_METADATA[mode];
  if (meta) {
    const textEl = document.getElementById('activeModeText');
    if (textEl) textEl.textContent = meta.label;
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
  // Check if context menu saved an active mode override
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
      document.getElementById('markdownOutput').value = 'Impossible d\'accéder à l\'onglet actuel.';
      return;
    }

    // Don't run on chrome:// or extension pages
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://'))) {
      document.getElementById('markdownOutput').value = 'Impossible d\'exécuter l\'extension sur les pages système du navigateur.';
      document.getElementById('pageTitle').textContent = tab.title || 'Page système';
      return;
    }

    // Inject content script dynamically if needed
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/content.js']
      });
    } catch (e) {
      // Content script may already be injected or restricted
    }

    // Send message to extract HTML
    chrome.tabs.sendMessage(tab.id, { action: 'getPageContent', mode: currentMode }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        document.getElementById('markdownOutput').value = 'Échec de l\'extraction du contenu de l\'onglet.';
        return;
      }

      const { title, url, html, hasSelection } = response.data;
      currentTitle = title || 'page web';
      currentUrl = url || '';
      currentHtml = html || '';

      document.getElementById('pageTitle').textContent = currentTitle;

      // Selection badge state
      const selBadge = document.getElementById('selectionBadge');
      if (hasSelection) {
        selBadge.textContent = 'Actif';
        selBadge.classList.add('active');
      } else {
        selBadge.textContent = 'Inactif';
        selBadge.classList.remove('active');
      }

      convertHtmlToMarkdown();
    });
  } catch (err) {
    document.getElementById('markdownOutput').value = 'Erreur: ' + err.message;
  }
}

function convertHtmlToMarkdown() {
  if (!currentHtml) {
    document.getElementById('markdownOutput').value = 'Aucun contenu HTML trouvé à convertir.';
    return;
  }

  if (typeof window.TurndownService === 'undefined') {
    document.getElementById('markdownOutput').value = 'La bibliothèque Turndown n\'a pas pu être chargée.';
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

    // Apply GFM Plugin if enabled
    if (userSettings.gfm && window.turndownPluginGfm) {
      const gfmPlugin = typeof window.turndownPluginGfm === 'function'
        ? window.turndownPluginGfm
        : (window.turndownPluginGfm.gfm || window.turndownPluginGfm.default);

      if (typeof gfmPlugin === 'function' || Array.isArray(gfmPlugin)) {
        turndownService.use(gfmPlugin);
      }
    }

    // Handle Image filtering if disabled
    if (!userSettings.keepImages) {
      turndownService.addRule('removeImages', {
        filter: ['img'],
        replacement: () => ''
      });
    }

    // Convert
    let markdown = turndownService.turndown(currentHtml);

    // Prepend metadata header
    const header = `# ${currentTitle}\n\n> Source: [${currentUrl}](${currentUrl})\n\n---\n\n`;
    currentMarkdown = header + markdown;

    document.getElementById('markdownOutput').value = currentMarkdown;
    updateMetaCount();
  } catch (err) {
    document.getElementById('markdownOutput').value = 'Erreur de conversion: ' + err.message;
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
    metaEl.textContent = `${formatCompactNum(len)} car. · ${formatCompactNum(wordCount)} mots`;
    metaEl.title = `${len.toLocaleString()} caractères, ${wordCount.toLocaleString()} mots`;
  }
}

function updatePreview(mdText) {
  const previewEl = document.getElementById('markdownPreview');
  if (!mdText || !mdText.trim()) {
    previewEl.innerHTML = '<p class="placeholder-text">Aucun contenu à prévisualiser.</p>';
    return;
  }

  // Simple, safe Markdown to HTML preview generator
  let html = mdText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks ```
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headers (# H1, ## H2, ### H3)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Blockquotes
  html = html.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  previewEl.innerHTML = html;
}

function copyMarkdown() {
  if (!currentMarkdown) return;
  navigator.clipboard.writeText(currentMarkdown).then(() => {
    showToast('Copié dans le presse-papiers !');
  }).catch(() => {
    // Fallback copy using textarea select
    const area = document.getElementById('markdownOutput');
    area.select();
    document.execCommand('copy');
    showToast('Copié dans le presse-papiers !');
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

  showToast(`${filename} téléchargé`);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}
