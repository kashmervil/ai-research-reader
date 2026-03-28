# AI Research Reader

A single-page reader for AI-generated research articles. Works on GitHub Pages — no server required.

AI chat apps are poor at displaying long-form research — output gets buried in threads, formatting is limited, diagrams don't render. This reader takes `.md` files and presents them as polished, navigable web pages.

## Quick start

1. Open the GitHub Pages URL (or serve locally: `python3 -m http.server -b 127.0.0.1 3000`)
2. Click the **+** button in the sidebar toolbar to import `.md` files
3. Articles are stored in your browser (IndexedDB, with localStorage fallback)

No npm, no build step, no server dependencies.

## How to use

### 1. Generate an article

Append `prompts/formatting-rules.md` to your research prompt (select all → copy → paste). It tells the AI to output a downloadable `.md` file with proper structure, tables, code blocks, diagrams, and evidence tags.

For a guided research workflow, use `prompts/research-prompt-factory.md` as a system prompt — it interviews you and builds a precise research request for a stronger model.

### 2. Import the file

Click the **+** button in the sidebar toolbar and select one or more `.md` files. They are stored in localStorage and appear in the sidebar immediately.

### 3. Read

Click an article in the sidebar. Use the trash icon to delete articles you no longer need.

## Features

- **Markdown rendering** — full GFM via marked.js with syntax-highlighted code blocks (highlight.js, GitHub theme)
- **Mermaid diagrams** — `mermaid` fenced blocks render as interactive SVGs
- **Light / dark theme** — toggle with system preference detection, persisted across sessions
- **Master-detail sidebar** — article list with progress bars → collapsible TOC tree (h2–h4) with back navigation
- **Scroll-spy** — TOC highlights current section, auto-expands ancestors
- **Resizable sidebar** — drag handle, width persisted in localStorage
- **Sidebar pin** — pinned keeps sidebar open; unpinned auto-closes when clicking content
- **Article search** — search within article content, highlighted snippet results under TOC headings
- **Auto-hiding header** — hides on scroll down, reveals on scroll up; shows article title only when h1 not visible
- **Reading progress** — per-article scroll position saved and restored, progress bars in sidebar, percentage in header
- **Evidence tags** — `[Std]`, `[Standard]`, `[Inference]`, `[Platform]`, `[Library]`, `[Vendor]` → colored badge pills
- **Link preview chips** — external URLs become chips with site favicons
- **Adaptive reading time** — estimates remaining time, learns your reading speed
- **URL routing** — `#article-name/heading-N` format, shareable heading links
- **YAML front matter** — stripped automatically before rendering
- **Article import/delete** — import `.md` files via file picker, delete with trash button
- **IndexedDB storage** — articles stored in IndexedDB for large capacity; automatic migration from localStorage; transparent fallback if IndexedDB unavailable
- **Responsive layout** — mobile/tablet with collapsible sidebar overlay
- **Zero build step** — static files, works on GitHub Pages, no npm, no bundler

## Vendored libraries

Libraries in `lib/` for zero-dependency, offline use.

| Library | Version | Purpose |
|---------|---------|---------|
| [marked.js](https://marked.js.org/) | 4.3.0 | Markdown → HTML parser |
| [highlight.js](https://highlightjs.org/) | 11.11.1 | Syntax highlighting |
| [Mermaid](https://mermaid.js.org/) | 11.13.0 | Diagram rendering |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | — | Code block font (woff2) |

## File structure

```
index.html                      — SPA shell
style.css                       — light/dark theme, sidebar, layout
lib/app.js                      — all logic: loader, renderer, TOC, scroll-spy, IndexedDB/localStorage storage
lib/marked.min.js               — markdown parser (v4.3.0)
lib/highlight.min.js            — syntax highlighting (v11.11.1)
lib/mermaid.min.js              — diagram rendering (v11.13.0)
lib/highlight-github.css        — GitHub syntax theme
lib/fonts/                      — JetBrains Mono (woff2)
prompts/
  formatting-rules.md           — copy-paste formatting prompt for AI
  research-prompt-factory.md    — system prompt for research interview workflow
```

## Storage

Articles are stored in the browser's **IndexedDB** (`aiResearchReader` database) for larger capacity than localStorage. On first load, any existing localStorage articles are automatically migrated. If IndexedDB is unavailable (e.g., Firefox private browsing), the app falls back to localStorage transparently. Settings (theme, sidebar state, reading progress) remain in localStorage. No files are read from the server filesystem — the app works as a fully static site on GitHub Pages.
