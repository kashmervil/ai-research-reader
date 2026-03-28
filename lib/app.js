/* app.js — article loader, renderer, TOC, evidence tags, mermaid, theme, sidebar
 * Vendored libs: marked.js v4.3.0, highlight.js v11.11.1, mermaid v11.13.0
 */

(function () {
  if (typeof marked === 'undefined' || typeof hljs === 'undefined') {
    return console.error('marked.js or highlight.js not loaded');
  }

  // ─── Marked setup ─────────────────────────────────────
  var renderer = new marked.Renderer();
  renderer.table = function (header, body) {
    return '<div class="table-wrap"><table><thead>' + header + '</thead><tbody>' + body + '</tbody></table></div>';
  };

  marked.setOptions({
    renderer: renderer,
    highlight: function (code, lang) {
      if (lang === 'mermaid') return code;
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
    gfm: true,
    breaks: false,
  });

  // ─── DOM refs ─────────────────────────────────────────
  var contentEl = document.getElementById('content');
  var tocEl = document.getElementById('toc');
  var sidebar = document.getElementById('sidebar');
  var sidebarToggle = document.getElementById('sidebarToggle');
  var themeToggle = document.getElementById('themeToggle');
  var topBarTitle = document.getElementById('topBarTitle');
  var topBar = document.querySelector('.top-bar');
  var articleListEl = document.querySelector('.article-list');
  var sidebarPanels = document.getElementById('sidebarPanels');
  var detailTitle = document.getElementById('detailTitle');
  var sidebarBack = document.getElementById('sidebarBack');
  var searchToggleBtn = document.getElementById('searchToggle');
  var pinToggleBtn = document.getElementById('pinToggle');
  var searchInput = document.getElementById('sidebarSearch');
  var searchWrap = document.getElementById('searchWrap');
  var searchClearBtn = document.getElementById('searchClear');

  // ─── Shared state ─────────────────────────────────────
  var currentArticle = null;
  var previewSlug = null; // slug being previewed (TOC shown but content not loaded)
  var articleLinks = [];
  var mermaidCounter = 0;
  var knownArticles = {};
  var h1Observer = null;
  var tocObserver = null;
  var tocToggleBound = false;

  // ─── Cleanup registry ─────────────────────────────────
  // Article-level cleanup callbacks (scroll-spy, reading tracker, etc.)
  var cleanupFns = [];
  function registerCleanup(fn) { cleanupFns.push(fn); }
  function runCleanup() {
    cleanupFns.forEach(function (fn) { fn(); });
    cleanupFns = [];
  }

  // ─── Utilities ────────────────────────────────────────
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function articleSlugToTitle(slug) {
    return slug
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function stripFrontMatter(md) {
    var match = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (match) return md.slice(match[0].length);
    return md;
  }

  var SCROLL_DURATION = 80;
  var SCROLL_OFFSET = 56;

  function smoothScrollTo(element, duration) {
    if (!element) return;
    duration = duration || SCROLL_DURATION;
    var targetY = element.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    var startY = window.scrollY;
    var diff = targetY - startY;
    if (Math.abs(diff) < 1) return;
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var ease = progress * (2 - progress);
      window.scrollTo(0, startY + diff * ease);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ─── Dark mode ────────────────────────────────────────
  var darkMode = localStorage.getItem('darkMode');
  if (darkMode === null) {
    darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    darkMode = darkMode === 'true';
  }

  function getMermaidThemeVars() {
    return darkMode ? {
      primaryColor: '#3a3a3c',
      primaryTextColor: '#f5f5f7',
      primaryBorderColor: '#48484a',
      lineColor: '#636366',
      secondaryColor: '#2c2c2e',
      tertiaryColor: '#1c1c1e',
      noteBkgColor: '#2c2c2e',
      noteTextColor: '#f5f5f7',
      actorTextColor: '#f5f5f7',
      signalTextColor: '#f5f5f7',
    } : {
      primaryColor: '#e8e8ed',
      primaryTextColor: '#1d1d1f',
      primaryBorderColor: '#c7c7cc',
      lineColor: '#8e8e93',
      secondaryColor: '#f2f2f7',
      tertiaryColor: '#ffffff',
      noteBkgColor: '#f2f2f7',
      noteTextColor: '#1d1d1f',
      actorTextColor: '#1d1d1f',
      signalTextColor: '#1d1d1f',
    };
  }

  function initMermaid() {
    if (typeof mermaid === 'undefined') return;
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: getMermaidThemeVars(),
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: 14,
    });
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    initMermaid();
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      darkMode = !darkMode;
      localStorage.setItem('darkMode', darkMode);
      applyTheme();
      if (currentArticle) {
        var scrollY = window.scrollY;
        loadArticle(currentArticle, true).then(function () {
          window.scrollTo(0, scrollY);
        });
      }
    });
  }

  applyTheme();

  // ─── Sidebar: collapse, resize, pin ───────────────────
  var sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

  function applySidebarState() {
    document.body.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      sidebarCollapsed = !sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
      applySidebarState();
      if (!sidebarCollapsed && currentArticle) {
        showSidebarDetail(detailTitle ? detailTitle.textContent : '');
      }
    });
  }

  var savedWidth = localStorage.getItem('sidebarWidth');
  if (savedWidth) {
    document.documentElement.style.setProperty('--sidebar-width', savedWidth + 'px');
  }

  applySidebarState();

  var resizeHandle = document.getElementById('sidebarResize');
  if (resizeHandle) {
    var dragging = false;
    resizeHandle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      dragging = true;
      resizeHandle.classList.add('dragging');
      document.body.classList.add('sidebar-resizing');
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var w = Math.min(Math.max(e.clientX, 200), 500);
      document.documentElement.style.setProperty('--sidebar-width', w + 'px');
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      resizeHandle.classList.remove('dragging');
      document.body.classList.remove('sidebar-resizing');
      var current = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim();
      localStorage.setItem('sidebarWidth', parseInt(current, 10));
    });
  }

  var sidebarPinned = localStorage.getItem('sidebarPinned') !== 'false';

  function applyPinState() {
    if (pinToggleBtn) pinToggleBtn.classList.toggle('active', sidebarPinned);
  }
  applyPinState();

  if (pinToggleBtn) {
    pinToggleBtn.addEventListener('click', function () {
      sidebarPinned = !sidebarPinned;
      localStorage.setItem('sidebarPinned', sidebarPinned);
      applyPinState();
    });
  }

  if (contentEl) {
    contentEl.addEventListener('click', function () {
      if (!sidebarCollapsed && (!sidebarPinned || window.innerWidth <= 960)) {
        sidebarCollapsed = true;
        localStorage.setItem('sidebarCollapsed', 'true');
        applySidebarState();
      }
    });
  }

  // ─── Sidebar: master-detail navigation ────────────────
  function showSidebarDetail(title) {
    if (sidebarPanels) sidebarPanels.classList.add('show-detail');
    if (detailTitle) detailTitle.textContent = title || '';
    if (searchWrap && !searchWrap.hidden && searchInput && searchInput.value.trim()) {
      if (articleListEl) articleListEl.querySelectorAll('.search-hidden').forEach(function (el) { el.classList.remove('search-hidden'); });
      searchArticle(searchInput.value.trim());
    }
  }

  function showSidebarList() {
    if (sidebarPanels) sidebarPanels.classList.remove('show-detail');
    if (searchWrap && !searchWrap.hidden && searchInput && searchInput.value.trim()) {
      clearTOCSearchState();
      searchArticleList(searchInput.value.trim());
    }
  }

  if (sidebarBack) {
    sidebarBack.addEventListener('click', function () {
      showSidebarList();
    });
  }

  if (detailTitle) {
    detailTitle.addEventListener('click', function () {
      var slug = previewSlug || currentArticle;
      if (!slug) return;
      previewSlug = null;
      if (location.hash === '#' + slug) {
        onHash();
      } else {
        location.hash = slug;
      }
    });
  }

  // ─── Rendering: mermaid, evidence tags, link chips ────
  function renderMermaidBlocks() {
    if (typeof mermaid === 'undefined') return;
    var codeBlocks = contentEl.querySelectorAll('code.language-mermaid');
    codeBlocks.forEach(function (codeEl) {
      var pre = codeEl.parentElement;
      if (!pre || pre.tagName !== 'PRE') return;
      var source = codeEl.textContent;
      var wrap = document.createElement('div');
      wrap.className = 'mermaid-wrap';
      var inner = document.createElement('div');
      inner.className = 'mermaid';
      inner.textContent = source;
      inner.id = 'mermaid-' + (++mermaidCounter);
      wrap.appendChild(inner);
      pre.parentNode.replaceChild(wrap, pre);
    });
    mermaid.run({ nodes: contentEl.querySelectorAll('.mermaid') });
  }

  var TAG_MAP = {
    'Std': 'std', 'Standard': 'std', 'Standards': 'std', 'Standards-defined': 'std',
    'Platform': 'platform',
    'Library': 'library',
    'Vendor': 'vendor',
    'Internal': 'internal',
    'Inference': 'inference',
    'Field synthesis': 'inference',
  };

  function styleEvidenceTags(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (!node.nodeValue || !/\[/.test(node.nodeValue)) return;
      var parent = node.parentNode;
      if (!parent) return;
      var el = parent;
      while (el && el !== root) {
        if (el.tagName === 'PRE' || el.tagName === 'CODE') return;
        el = el.parentNode;
      }
      var replaced = node.nodeValue.replace(/\[([^\]]{1,50})\]/g, function (match, inner) {
        var cls = TAG_MAP[inner];
        if (cls) return '<span class="tag tag-' + cls + '">' + inner + '</span>';
        if (/weak|field/i.test(inner)) return '<span class="tag tag-weak">' + inner + '</span>';
        return match;
      });
      if (replaced !== node.nodeValue) {
        var span = document.createElement('span');
        span.innerHTML = replaced;
        parent.replaceChild(span, node);
      }
    });
  }

  var FAVICON_MAP = {
    'docs.oracle.com': 'https://www.oracle.com/favicon.ico',
    'www.oracle.com': 'https://www.oracle.com/favicon.ico',
    'developer.mozilla.org': 'https://developer.mozilla.org/favicon-48x48.png',
    'www.rfc-editor.org': 'https://www.rfc-editor.org/favicon.ico',
    'datatracker.ietf.org': 'https://datatracker.ietf.org/static/ietf/images/ietflogo-small-transparent.png',
    'tools.ietf.org': 'https://www.ietf.org/favicon.ico',
    'github.com': 'https://github.com/favicon.ico',
    'square.github.io': 'https://github.com/favicon.ico',
    'kotlinlang.org': 'https://kotlinlang.org/assets/images/favicon.svg',
    'ktor.io': 'https://ktor.io/favicon.ico',
    'www.jetbrains.com': 'https://www.jetbrains.com/favicon.ico',
    'plugins.jetbrains.com': 'https://www.jetbrains.com/favicon.ico',
    'www.graalvm.org': 'https://www.graalvm.org/favicon.ico',
    'learn.microsoft.com': 'https://learn.microsoft.com/favicon.ico',
    'docs.microsoft.com': 'https://learn.microsoft.com/favicon.ico',
    'web.mit.edu': 'https://web.mit.edu/favicon.ico',
    'curl.se': 'https://curl.se/favicon.ico',
    'chromium.googlesource.com': 'https://www.chromium.org/favicon.ico',
    'www.chromium.org': 'https://www.chromium.org/favicon.ico',
    'stackoverflow.com': 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico',
    'en.wikipedia.org': 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
    'www.cloudflare.com': 'https://www.cloudflare.com/favicon.ico',
    'developers.cloudflare.com': 'https://www.cloudflare.com/favicon.ico',
  };

  var faviconCache = {};

  function getFaviconUrl(hostname) {
    if (FAVICON_MAP[hostname]) return FAVICON_MAP[hostname];
    if (faviconCache[hostname]) return faviconCache[hostname];
    var url = 'https://www.google.com/s2/favicons?domain=' + hostname + '&sz=32';
    faviconCache[hostname] = url;
    return url;
  }

  function renderLinkChips(root) {
    var links = root.querySelectorAll('a[href^="http"]');
    links.forEach(function (a) {
      if (a.closest('h1, h2, h3, h4') || a.classList.contains('link-chip')) return;
      var href = a.href;
      try { var url = new URL(href); } catch (e) { return; }

      var chip = document.createElement('a');
      chip.href = href;
      chip.className = 'link-chip';
      chip.target = '_blank';
      chip.rel = 'noopener';

      var img = document.createElement('img');
      img.src = getFaviconUrl(url.hostname);
      img.alt = '';
      img.onerror = function () { this.style.display = 'none'; };

      var domain = document.createElement('span');
      domain.className = 'link-chip-domain';
      domain.textContent = a.textContent || url.hostname;

      chip.appendChild(img);
      chip.appendChild(domain);
      a.parentNode.replaceChild(chip, a);
    });
  }

  // ─── Reading progress ─────────────────────────────────
  function getReadProgress(slug) {
    try {
      var raw = localStorage.getItem('readProgress:' + slug);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveReadProgress(slug, scrollY, percent) {
    localStorage.setItem('readProgress:' + slug, JSON.stringify({ scrollY: scrollY, percent: Math.round(percent) }));
  }

  function getProgressEl() {
    var el = document.getElementById('topBarProgress');
    if (!el) {
      el = document.createElement('span');
      el.id = 'topBarProgress';
      el.className = 'top-bar-progress';
      if (topBar) topBar.insertBefore(el, themeToggle);
    }
    return el;
  }

  function updateArticleProgressBar(slug) {
    var a = articleListEl ? articleListEl.querySelector('[data-article="' + slug + '"]') : null;
    if (!a) return;
    var prog = getReadProgress(slug);
    var bar = a.querySelector('.article-progress');
    var pct = prog ? Math.min(prog.percent, 100) : 0;
    if (pct <= 0) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'article-progress';
      bar.innerHTML = '<div class="article-progress-track"><div class="article-progress-fill"></div></div><span class="article-progress-label"></span>';
      a.appendChild(bar);
    }
    bar.querySelector('.article-progress-fill').style.width = pct + '%';
    bar.querySelector('.article-progress-label').textContent = pct + '%';
  }

  // ─── Reading time ─────────────────────────────────────
  var DEFAULT_WPM = 220;
  var readingWpm = parseFloat(localStorage.getItem('readingWpm')) || DEFAULT_WPM;

  function countWords(el) {
    var text = el.innerText || '';
    return text.split(/\s+/).filter(function (w) { return w.length > 0; }).length;
  }

  function formatTime(minutes) {
    if (minutes < 1) return '< 1 min';
    return Math.round(minutes) + ' min';
  }

  function getReadingEl() {
    var el = document.getElementById('readingTime');
    if (!el) {
      el = document.createElement('span');
      el.id = 'readingTime';
      el.className = 'reading-time';
      if (topBar) topBar.insertBefore(el, themeToggle);
    }
    return el;
  }

  function buildReadingTime() {
    var el = getReadingEl();
    if (!contentEl) { el.textContent = ''; return; }

    var totalWords = countWords(contentEl);
    var totalMinutes = totalWords / readingWpm;
    el.textContent = formatTime(totalMinutes) + ' read';
    el.title = totalWords + ' words · ' + Math.round(readingWpm) + ' wpm';

    var readingTracker = null;
    var startTime = Date.now();
    var maxScrollY = 0;
    var docHeight = Math.max(document.body.scrollHeight - window.innerHeight, 1);
    var lastUpdate = 0;

    readingTracker = function () {
      var now = Date.now();
      if (now - lastUpdate < 200) return;
      lastUpdate = now;

      var scrollY = window.scrollY;
      if (scrollY > maxScrollY) maxScrollY = scrollY;

      docHeight = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      var currentProgress = Math.min(scrollY / docHeight, 1);
      var maxProgress = Math.min(maxScrollY / docHeight, 1);
      var elapsed = (now - startTime) / 60000;

      if (elapsed > 0.5 && maxProgress > 0.1) {
        var wordsRead = totalWords * maxProgress;
        var measuredWpm = wordsRead / elapsed;
        if (measuredWpm > 50 && measuredWpm < 1000) {
          readingWpm = readingWpm * 0.7 + measuredWpm * 0.3;
          localStorage.setItem('readingWpm', readingWpm.toFixed(1));
        }
      }

      var wordsLeft = totalWords * (1 - currentProgress);
      var minutesLeft = wordsLeft / readingWpm;
      el.textContent = currentProgress >= 0.95
        ? 'Done'
        : formatTime(minutesLeft) + ' left';
      el.title = totalWords + ' words · ' + Math.round(readingWpm) + ' wpm · ' + Math.round(currentProgress * 100) + '%';

      var pct = Math.round(currentProgress * 100);
      if (currentArticle) {
        saveReadProgress(currentArticle, scrollY, pct);
        updateArticleProgressBar(currentArticle);
      }
      var progressEl = getProgressEl();
      progressEl.textContent = pct > 0 ? pct + '%' : '';
    };

    window.addEventListener('scroll', readingTracker, { passive: true });

    registerCleanup(function () {
      if (readingTracker) {
        window.removeEventListener('scroll', readingTracker);
        readingTracker = null;
      }
    });
  }

  // ─── TOC: shared tree builder ─────────────────────────
  function buildTOCTreeHTML(headings, slug) {
    var root = { children: [], level: 1 };
    var stack = [root];

    headings.forEach(function (h) {
      var node = { id: h.id, text: h.text, level: h.level, children: [], element: h.element || null };
      while (stack.length > 1 && stack[stack.length - 1].level >= h.level) stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    });

    function renderNode(node) {
      var hashTarget = slug ? slug + '/' + node.id : node.id;
      var hasKids = node.children.length > 0;
      var html = '<li class="toc-h' + node.level + '">';
      html += '<div class="toc-node">';
      if (hasKids) {
        html += '<button class="toc-toggle" aria-expanded="false" data-for="' + node.id + '-children">'
          + '<svg width="10" height="10" viewBox="0 0 10 10"><polyline points="3,2 7,5 3,8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          + '</button>';
      }
      html += '<a href="#' + hashTarget + '" data-heading="' + node.id + '">' + escapeHtml(node.text) + '</a>';
      html += '</div>';
      if (hasKids) {
        html += '<ul class="toc-children" id="' + node.id + '-children" hidden>';
        node.children.forEach(function (c) { html += renderNode(c); });
        html += '</ul>';
      }
      html += '</li>';
      return html;
    }

    var html = '';
    root.children.forEach(function (c) { html += renderNode(c); });
    return { html: html, root: root };
  }

  function expandTopLevelTOC(root) {
    root.children.forEach(function (child) {
      if (child.children.length > 0) {
        var el = document.getElementById(child.id + '-children');
        var btn = tocEl.querySelector('[data-for="' + child.id + '-children"]');
        if (el) el.removeAttribute('hidden');
        if (btn) { btn.setAttribute('aria-expanded', 'true'); btn.classList.add('expanded'); }
      }
    });
  }

  // ─── TOC: full build from rendered DOM (with scroll-spy) ──
  function buildTOC() {
    if (!tocEl) return;

    if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }

    var h1El = contentEl.querySelector('h1');
    if (h1El) h1El.id = 'heading-0';
    var domHeadings = contentEl.querySelectorAll('h2, h3, h4');
    if (domHeadings.length === 0) { tocEl.innerHTML = ''; return; }

    // Convert DOM headings to data array
    var headings = [];
    domHeadings.forEach(function (h, i) {
      var id = 'heading-' + (i + 1);
      h.id = id;
      headings.push({ id: id, text: h.textContent, level: parseInt(h.tagName.charAt(1), 10), element: h });
    });

    var result = buildTOCTreeHTML(headings, currentArticle);
    tocEl.innerHTML = result.html;
    expandTopLevelTOC(result.root);

    // Toggle handler — attach once via delegation
    if (!tocToggleBound) {
      tocToggleBound = true;
      tocEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.toc-toggle');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        var targetId = btn.getAttribute('data-for');
        var childrenUl = document.getElementById(targetId);
        if (!childrenUl) return;
        var isExpanded = !childrenUl.hidden;
        childrenUl.hidden = isExpanded;
        btn.setAttribute('aria-expanded', String(!isExpanded));
        btn.classList.toggle('expanded', !isExpanded);
      });
    }

    // Flat list for scroll-spy
    var allNodes = [];
    (function flatten(list) {
      list.forEach(function (n) { allNodes.push(n); flatten(n.children); });
    })(result.root.children);

    function expandAncestorsOf(headingId) {
      (function walk(list) {
        for (var i = 0; i < list.length; i++) {
          var n = list[i];
          if (n.id === headingId) return true;
          if (n.children.length > 0 && walk(n.children)) {
            var el = document.getElementById(n.id + '-children');
            var btn = tocEl.querySelector('[data-for="' + n.id + '-children"]');
            if (el) el.removeAttribute('hidden');
            if (btn) { btn.setAttribute('aria-expanded', 'true'); btn.classList.add('expanded'); }
            return true;
          }
        }
        return false;
      })(result.root.children);
    }

    var activeId = null;

    function setActiveToc(id) {
      if (id === activeId) return;
      activeId = id;
      tocEl.querySelectorAll('a').forEach(function (a) {
        a.classList.toggle('toc-active', a.getAttribute('data-heading') === id);
      });
      if (id) expandAncestorsOf(id);
      var activeLink = tocEl.querySelector('a.toc-active');
      if (activeLink && sidebar) {
        var linkRect = activeLink.getBoundingClientRect();
        var sidebarRect = sidebar.getBoundingClientRect();
        if (linkRect.top < sidebarRect.top || linkRect.bottom > sidebarRect.bottom) {
          activeLink.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }
    }

    // IntersectionObserver for scroll-spy
    var headingStates = {};
    tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { headingStates[entry.target.id] = entry.isIntersecting; });
      for (var i = 0; i < allNodes.length; i++) {
        if (headingStates[allNodes[i].id]) { setActiveToc(allNodes[i].id); return; }
      }
      for (var j = allNodes.length - 1; j >= 0; j--) {
        if (allNodes[j].element.getBoundingClientRect().top < 100) { setActiveToc(allNodes[j].id); return; }
      }
    }, { rootMargin: '-48px 0px -60% 0px', threshold: 0 });

    domHeadings.forEach(function (h) { tocObserver.observe(h); });

    // Scroll fallback
    var scrollTimer = null;
    function onScrollSpy() {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () {
        scrollTimer = null;
        var best = null;
        for (var i = 0; i < allNodes.length; i++) {
          if (allNodes[i].element.getBoundingClientRect().top <= 80) best = allNodes[i].id;
        }
        if (best) setActiveToc(best);
      }, 80);
    }

    window.addEventListener('scroll', onScrollSpy, { passive: true });

    registerCleanup(function () {
      window.removeEventListener('scroll', onScrollSpy);
      if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }
    });
  }

  // ─── TOC: preview from markdown (no content render) ───
  function extractHeadingsFromMd(md) {
    var headings = [];
    var lines = md.split('\n');
    var inCode = false;
    for (var i = 0; i < lines.length; i++) {
      if (/^```/.test(lines[i])) { inCode = !inCode; continue; }
      if (inCode) continue;
      var m = lines[i].match(/^(#{2,4})\s+(.+)/);
      if (m) headings.push({ level: m[1].length, text: m[2].replace(/[*_`\[\]]/g, '').trim() });
    }
    return headings;
  }

  function previewArticleTOC(slug) {
    previewSlug = slug;
    showSidebarDetail(articleSlugToTitle(slug));

    return fetch('articles/' + slug + '.md')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (md) {
        md = stripFrontMatter(md);
        var headings = extractHeadingsFromMd(md);
        if (!tocEl || headings.length === 0) { if (tocEl) tocEl.innerHTML = ''; return; }

        // Assign sequential IDs matching what buildTOC would produce
        headings.forEach(function (h, i) { h.id = 'heading-' + (i + 1); });

        var result = buildTOCTreeHTML(headings, slug);
        tocEl.innerHTML = result.html;
        expandTopLevelTOC(result.root);
      })
      .catch(function () {
        if (tocEl) tocEl.innerHTML = '';
      });
  }

  // ─── Article loading ──────────────────────────────────
  function loadArticle(name, preserveScroll) {
    if (!name) { showWelcome(); return Promise.resolve(); }
    if (h1Observer) { h1Observer.disconnect(); h1Observer = null; }
    runCleanup();
    clearSearch();
    return fetch('articles/' + name + '.md')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (md) {
        md = stripFrontMatter(md);
        currentArticle = name;
        previewSlug = null;
        contentEl.innerHTML = marked.parse(md);
        renderMermaidBlocks();
        styleEvidenceTags(contentEl);
        renderLinkChips(contentEl);
        buildTOC();
        buildReadingTime();
        highlightActiveLink(name);
        updateTitle(name);
        showSidebarDetail(articleSlugToTitle(name));
        sessionStorage.setItem('currentArticle', name);
        if (!preserveScroll) {
          var saved = getReadProgress(name);
          if (saved && saved.scrollY > 0) {
            window.scrollTo(0, saved.scrollY);
          } else {
            window.scrollTo(0, 0);
          }
        }
        var progressEl = getProgressEl();
        var saved2 = getReadProgress(name);
        progressEl.textContent = saved2 && saved2.percent > 0 ? saved2.percent + '%' : '';
      })
      .catch(function () {
        var msg = document.createElement('div');
        msg.className = 'welcome';
        msg.innerHTML = '<h1>Not found</h1>';
        var p = document.createElement('p');
        p.textContent = 'articles/' + name + '.md does not exist.';
        msg.appendChild(p);
        contentEl.innerHTML = '';
        contentEl.appendChild(msg);
      });
  }

  function showWelcome() {
    if (h1Observer) { h1Observer.disconnect(); h1Observer = null; }
    contentEl.innerHTML = '<div class="welcome"><h1>AI Research Reader</h1><p>Select an article from the sidebar.</p></div>';
    if (tocEl) tocEl.innerHTML = '';
    highlightActiveLink(null);
    if (topBarTitle) topBarTitle.textContent = 'AI Research Reader';
    currentArticle = null;
    sessionStorage.removeItem('currentArticle');
    showSidebarList();
    clearSearch();
  }

  function highlightActiveLink(name) {
    var links = articleListEl ? articleListEl.querySelectorAll('a') : [];
    links.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-article') === name);
    });
  }

  function updateTitle(name) {
    if (h1Observer) { h1Observer.disconnect(); h1Observer = null; }
    var slugTitle = articleSlugToTitle(name);
    var h1 = contentEl.querySelector('h1');
    if (!h1) {
      if (topBarTitle) topBarTitle.textContent = slugTitle;
      return;
    }
    if (topBarTitle) topBarTitle.textContent = '';
    h1Observer = new IntersectionObserver(function (entries) {
      if (!topBarTitle) return;
      topBarTitle.textContent = entries[0].isIntersecting ? '' : slugTitle;
    }, { threshold: 0 });
    h1Observer.observe(h1);
  }

  // ─── Article discovery ────────────────────────────────
  var CHEVRON_SVG = '<svg class="article-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4.5,2 8.5,6 4.5,10"/></svg>';

  function buildArticleList(slugs) {
    if (!articleListEl) return;
    articleListEl.innerHTML = '';
    knownArticles = {};
    slugs.forEach(function (slug) {
      knownArticles[slug] = true;
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + slug;
      a.setAttribute('data-article', slug);
      var titleSpan = document.createElement('span');
      titleSpan.className = 'article-title';
      titleSpan.textContent = articleSlugToTitle(slug);
      a.appendChild(titleSpan);
      a.insertAdjacentHTML('beforeend', CHEVRON_SVG);

      var prog = getReadProgress(slug);
      if (prog && prog.percent > 0) {
        var bar = document.createElement('div');
        bar.className = 'article-progress';
        var pct = Math.min(prog.percent, 100);
        bar.innerHTML = '<div class="article-progress-track"><div class="article-progress-fill" style="width:' + pct + '%"></div></div>'
          + '<span class="article-progress-label">' + pct + '%</span>';
        a.appendChild(bar);
      }

      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (slug === currentArticle) {
          previewSlug = null;
          showSidebarDetail(articleSlugToTitle(slug));
          return;
        }
        if (currentArticle) {
          previewArticleTOC(slug);
        } else {
          if (location.hash === '#' + slug) {
            onHash();
          } else {
            location.hash = slug;
          }
        }
      });
      li.appendChild(a);
      articleListEl.appendChild(li);
    });
    articleLinks = articleListEl.querySelectorAll('a');
  }

  function discoverArticles() {
    return fetch('articles/')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var slugs = [];
        var re = /href="([^"]+\.md)"/gi;
        var match;
        while ((match = re.exec(html)) !== null) {
          var filename = decodeURIComponent(match[1]);
          var slug = filename.replace(/\.md$/i, '');
          slugs.push(slug);
        }
        slugs.sort(function (a, b) { return a.localeCompare(b); });
        return slugs;
      })
      .catch(function () {
        return fetch('articles.json')
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .catch(function () {
            var existing = document.querySelectorAll('.article-list a');
            var slugs = [];
            existing.forEach(function (a) { slugs.push(a.getAttribute('data-article')); });
            return slugs;
          });
      });
  }

  // ─── Hash routing ─────────────────────────────────────
  function parseHash(hash) {
    if (!hash) return { article: null, heading: null };
    var idx = hash.indexOf('/');
    if (idx === -1) return { article: hash, heading: null };
    return { article: hash.substring(0, idx), heading: hash.substring(idx + 1) };
  }

  function onHash() {
    var hash = location.hash.replace('#', '');
    if (!hash) { showWelcome(); return; }

    var parsed = parseHash(hash);

    if (parsed.article && parsed.heading) {
      if (parsed.article === currentArticle) {
        var target = document.getElementById(parsed.heading);
        if (target && contentEl.contains(target)) smoothScrollTo(target);
        return;
      }
      currentArticle = parsed.article;
      loadArticle(parsed.article).then(function () {
        var el = document.getElementById(parsed.heading);
        if (el) smoothScrollTo(el);
      });
      return;
    }

    if (parsed.article === currentArticle) {
      showSidebarDetail(detailTitle ? detailTitle.textContent : articleSlugToTitle(parsed.article));
      return;
    }
    loadArticle(parsed.article);
  }

  window.addEventListener('hashchange', onHash);

  // ─── Auto-hiding header ───────────────────────────────
  var lastScrollY = 0;
  var headerHidden = false;

  function updateHeaderVisibility() {
    var scrollY = window.scrollY;
    if (scrollY < 48) {
      if (headerHidden) {
        headerHidden = false;
        if (topBar) topBar.classList.remove('top-bar-hidden');
      }
    } else if (scrollY > lastScrollY + 10) {
      if (!headerHidden) {
        headerHidden = true;
        if (topBar) topBar.classList.add('top-bar-hidden');
      }
    } else if (scrollY < lastScrollY - 5) {
      if (headerHidden) {
        headerHidden = false;
        if (topBar) topBar.classList.remove('top-bar-hidden');
      }
    }
    lastScrollY = scrollY;
  }

  window.addEventListener('scroll', updateHeaderVisibility, { passive: true });

  // ─── Search ───────────────────────────────────────────
  var searchDebounce = null;

  function clearTOCSearchState() {
    if (!tocEl) return;
    tocEl.querySelectorAll('.toc-search-result').forEach(function (el) { el.remove(); });
    tocEl.querySelectorAll('.toc-search-hidden').forEach(function (el) { el.classList.remove('toc-search-hidden'); });
    tocEl.querySelectorAll('a mark').forEach(function (mark) { mark.replaceWith(mark.textContent); });
    tocEl.querySelectorAll('a').forEach(function (a) { a.normalize(); });
  }

  function clearSearch() {
    if (searchInput) searchInput.value = '';
    if (searchWrap) searchWrap.hidden = true;
    if (searchToggleBtn) searchToggleBtn.classList.remove('active');
    clearTOCSearchState();
    if (articleListEl) {
      articleListEl.querySelectorAll('.search-hidden').forEach(function (el) { el.classList.remove('search-hidden'); });
    }
  }

  function searchArticleList(query) {
    if (!articleListEl) return;
    articleListEl.querySelectorAll('.search-hidden').forEach(function (el) { el.classList.remove('search-hidden'); });
    if (!query || query.length < 2) return;
    var lowerQ = query.toLowerCase();
    articleListEl.querySelectorAll('li').forEach(function (li) {
      var a = li.querySelector('a');
      if (!a) return;
      var title = (a.querySelector('.article-title') || a).textContent.toLowerCase();
      if (title.indexOf(lowerQ) === -1) {
        li.classList.add('search-hidden');
      }
    });
  }

  function getContentBetween(heading) {
    var fragment = document.createDocumentFragment();
    var el = heading.nextElementSibling;
    var level = parseInt(heading.tagName.charAt(1), 10);
    while (el) {
      if (/^H[1-4]$/.test(el.tagName) && parseInt(el.tagName.charAt(1), 10) <= level) break;
      fragment.appendChild(el.cloneNode(true));
      el = el.nextElementSibling;
    }
    return fragment;
  }

  function highlightTextInElement(el, query) {
    var text = el.textContent;
    var lowerText = text.toLowerCase();
    var lowerQ = query.toLowerCase();
    var idx = lowerText.indexOf(lowerQ);
    if (idx === -1) return;
    var before = text.substring(0, idx);
    var match = text.substring(idx, idx + query.length);
    var after = text.substring(idx + query.length);
    el.innerHTML = escapeHtml(before) + '<mark>' + escapeHtml(match) + '</mark>' + escapeHtml(after);
  }

  function searchArticle(query) {
    if (!tocEl || !contentEl) return;
    clearTOCSearchState();

    if (!query || query.length < 2) return;

    var lowerQ = query.toLowerCase();
    var headings = contentEl.querySelectorAll('h2, h3, h4');
    var matchingIds = {};

    headings.forEach(function (h) {
      var tocLink = tocEl.querySelector('a[data-heading="' + h.id + '"]');
      var headingMatches = tocLink && tocLink.textContent.toLowerCase().indexOf(lowerQ) !== -1;
      var section = getContentBetween(h);
      var text = section.textContent || '';
      var lowerText = text.toLowerCase();
      var contentMatches = lowerText.indexOf(lowerQ) !== -1;

      if (!headingMatches && !contentMatches) return;

      matchingIds[h.id] = true;

      if (headingMatches && tocLink) {
        highlightTextInElement(tocLink, query);
      }

      if (!contentMatches) return;

      if (tocLink) {
        var parentLi = tocLink.closest('li');
        if (parentLi) {
          var parentUl = parentLi.parentElement;
          if (parentUl && parentUl.classList.contains('toc-children') && parentUl.hidden) {
            parentUl.hidden = false;
            var btn = tocEl.querySelector('[data-for="' + parentUl.id + '"]');
            if (btn) { btn.setAttribute('aria-expanded', 'true'); btn.classList.add('expanded'); }
          }
        }
      }

      var count = 0;
      var searchIdx = 0;
      var insertTarget = tocLink ? tocLink.closest('li') : null;
      if (!insertTarget) return;

      while (count < 3 && searchIdx < lowerText.length) {
        var matchIdx = lowerText.indexOf(lowerQ, searchIdx);
        if (matchIdx === -1) break;

        var snippetStart = Math.max(0, matchIdx - 30);
        var snippetEnd = Math.min(text.length, matchIdx + query.length + 30);
        var snippet = (snippetStart > 0 ? '…' : '') +
          text.substring(snippetStart, matchIdx) +
          text.substring(matchIdx, matchIdx + query.length) +
          text.substring(matchIdx + query.length, snippetEnd) +
          (snippetEnd < text.length ? '…' : '');

        var resultEl = document.createElement('div');
        resultEl.className = 'toc-search-result';
        var before = snippet.substring(0, snippet.toLowerCase().indexOf(lowerQ));
        var matchText = snippet.substring(before.length, before.length + query.length);
        var after = snippet.substring(before.length + query.length);
        resultEl.innerHTML = escapeHtml(before) + '<mark>' + escapeHtml(matchText) + '</mark>' + escapeHtml(after);

        (function (heading) {
          resultEl.addEventListener('click', function () { smoothScrollTo(heading); });
        })(h);

        insertTarget.appendChild(resultEl);
        count++;
        searchIdx = matchIdx + query.length;
      }
    });

    // Hide TOC nodes that have no matches (and no matching descendants)
    function markVisible(li) {
      var link = li.querySelector(':scope > .toc-node > a[data-heading]');
      var headingId = link ? link.getAttribute('data-heading') : null;
      var selfMatches = headingId && matchingIds[headingId];
      var childrenUl = li.querySelector(':scope > .toc-children');
      var anyChildVisible = false;
      if (childrenUl) {
        var childLis = childrenUl.querySelectorAll(':scope > li');
        childLis.forEach(function (childLi) {
          if (markVisible(childLi)) anyChildVisible = true;
        });
      }
      if (selfMatches || anyChildVisible) {
        li.classList.remove('toc-search-hidden');
        return true;
      } else {
        li.classList.add('toc-search-hidden');
        return false;
      }
    }

    tocEl.querySelectorAll(':scope > li').forEach(function (li) { markVisible(li); });
  }

  function isDetailView() {
    return sidebarPanels && sidebarPanels.classList.contains('show-detail');
  }

  function runSearch(query) {
    if (isDetailView()) {
      searchArticle(query);
    } else {
      searchArticleList(query);
    }
  }

  if (searchToggleBtn) {
    searchToggleBtn.addEventListener('click', function () {
      if (!searchWrap) return;
      if (searchWrap.hidden) {
        searchWrap.hidden = false;
        searchToggleBtn.classList.add('active');
        searchInput.focus();
      } else {
        clearSearch();
      }
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', function () {
      clearSearch();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      if (searchDebounce) clearTimeout(searchDebounce);
      searchDebounce = setTimeout(function () {
        runSearch(searchInput.value.trim());
      }, 150);
    });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') clearSearch();
    });
  }

  // ─── Init ─────────────────────────────────────────────
  discoverArticles().then(function (slugs) {
    buildArticleList(slugs);
    onHash();
  });
})();
