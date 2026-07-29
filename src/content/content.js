// Content script to extract HTML and page metadata

(() => {
  if (window.__htmlToMdExtractorLoaded) return;
  window.__htmlToMdExtractorLoaded = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageContent') {
      try {
        const data = extractPageContent(request.mode || 'article');
        sendResponse({ success: true, data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true; // Keep message channel open for async response
  });

  function extractPageContent(mode) {
    const pageTitle = document.title || 'Page sans titre';
    const pageUrl = window.location.href;

    const selectionHtml = getSelectionHtml();
    const articleHtml = getArticleHtml();
    const fullHtml = getFullPageHtml();

    let targetHtml = articleHtml;
    if (mode === 'selection' && selectionHtml) {
      targetHtml = selectionHtml;
    } else if (mode === 'full') {
      targetHtml = fullHtml;
    } else {
      targetHtml = articleHtml || fullHtml;
    }

    return {
      title: pageTitle,
      url: pageUrl,
      html: targetHtml,
      hasSelection: Boolean(selectionHtml && selectionHtml.trim().length > 0)
    };
  }

  function getSelectionHtml() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return '';
    const container = document.createElement('div');
    for (let i = 0; i < sel.rangeCount; i++) {
      container.appendChild(sel.getRangeAt(i).cloneContents());
    }
    return container.innerHTML;
  }

  function getArticleHtml() {
    // Clone body to avoid mutating active page
    const clone = document.body.cloneNode(true);

    // Clean up junk elements
    const elementsToRemove = clone.querySelectorAll(
      'script, style, noscript, iframe, svg, nav, footer, header, form, button, [role="navigation"], [role="banner"], [role="contentinfo"], .ad, .ads, .sidebar, .comments, .menu'
    );
    elementsToRemove.forEach(el => el.remove());

    // Look for primary article/main container
    const articleEl = clone.querySelector('article, main, [role="main"], #content, .content, .post, .entry-content');
    if (articleEl && articleEl.innerHTML.trim().length > 100) {
      return sanitizeHtmlString(articleEl.innerHTML, window.location.origin);
    }

    return sanitizeHtmlString(clone.innerHTML, window.location.origin);
  }

  function getFullPageHtml() {
    const clone = document.body.cloneNode(true);
    // Remove inline scripts and styles
    const scripts = clone.querySelectorAll('script, style, noscript');
    scripts.forEach(s => s.remove());

    return sanitizeHtmlString(clone.innerHTML, window.location.origin);
  }

  function sanitizeHtmlString(html, origin) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Convert relative URLs (href & src) to absolute URLs so links and images resolve correctly in Markdown
    doc.querySelectorAll('a[href]').forEach(a => {
      try {
        a.setAttribute('href', new URL(a.getAttribute('href'), origin).href);
      } catch (e) {}
    });

    doc.querySelectorAll('img[src]').forEach(img => {
      try {
        img.setAttribute('src', new URL(img.getAttribute('src'), origin).href);
      } catch (e) {}
    });

    return doc.body.innerHTML;
  }
})();
