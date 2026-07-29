// Background Service Worker for HTML to Markdown Converter

const DEFAULT_SETTINGS = {
  headingStyle: 'atx', // 'atx' (#) or 'setext' (===)
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced', // 'fenced' (```) or 'indented'
  emDelimiter: '*',
  strongDelimiter: '**',
  gfm: true, // GitHub Flavored Markdown
  linkStyle: 'inlined',
  keepImages: true,
  mode: 'article' // 'article', 'selection', 'full'
};

// Initialize settings on installation
chrome.runtime.onInstalled.addListener(() => {
  try {
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
        chrome.storage.sync.set(items);
      });
    }

    // Create context menu safely
    if (chrome.contextMenus && typeof chrome.contextMenus.removeAll === 'function') {
      chrome.contextMenus.removeAll(() => {
        if (chrome.runtime.lastError) {
          // Ignore clear errors
        }
        if (chrome.contextMenus && typeof chrome.contextMenus.create === 'function') {
          chrome.contextMenus.create({
            id: 'convert-selection-to-md',
            title: 'Convertir la sélection en Markdown',
            contexts: ['selection']
          }, () => {
            if (chrome.runtime.lastError) {
              // Ignore duplicate menu errors
            }
          });
        }
      });
    }
  } catch (err) {
    console.error('Service worker installation setup error:', err);
  }
});

// Listen for context menu click safely with optional chaining
try {
  if (chrome.contextMenus?.onClicked?.addListener) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'convert-selection-to-md' && tab?.id) {
        if (chrome.storage?.local) {
          chrome.storage.local.set({ activeModeOverride: 'selection' }, () => {
            if (chrome.action?.openPopup) {
              chrome.action.openPopup().catch(() => {
                // openPopup may require user gesture in some Chrome builds
              });
            }
          });
        }
      }
    });
  }
} catch (err) {
  console.error('Context menu listener error:', err);
}
