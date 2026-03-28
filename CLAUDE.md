# AI Research Reader — Claude Instructions

## Project overview

Zero-dependency static SPA for reading AI-generated research articles. No npm, no build step — pure static files suitable for GitHub Pages. Articles are stored in IndexedDB (with localStorage fallback), imported via file picker.

## How to run

Hosted on GitHub Pages — just open the URL. For local development:

```bash
python3 -m http.server -b 127.0.0.1 3000
```

## File structure

```
README.md                       — setup, usage, features
CLAUDE.md                       — this file (dev conventions for Claude)
index.html                      — SPA shell
style.css                       — light/dark theme, sidebar, layout
lib/app.js                      — all logic: loader, renderer, TOC, scroll-spy, reading time, IndexedDB/localStorage storage
lib/marked.min.js               — markdown parser (v4.3.0 — NOT v15, breaking API)
lib/highlight.min.js            — syntax highlighting (v11.11.1)
lib/mermaid.min.js              — diagram rendering (v11.13.0)
lib/highlight-github.css        — GitHub syntax theme
lib/fonts/                      — JetBrains Mono woff2
prompts/
  formatting-rules.md           — copy-paste prompt for AI article generation
  research-prompt-factory.md    — system prompt for AI research interview workflow
```

## Key constraints

- **No build step** — plain static JS/CSS, no transpilation, no bundler
- **No server required** — article storage in IndexedDB (localStorage fallback), works on GitHub Pages
- **Vendored libs** — in `lib/`, no npm packages, no CDN links
- **marked.js v4.3.0** — incompatible with v5+/v15; keep vendored version

## Code conventions

- Vanilla JS (ES6+), no frameworks
- Single JS entry: `lib/app.js`
- CSS custom properties for theming (`data-theme` on `<html>`)
- Article storage: IndexedDB (`aiResearchReader` db, `articles` + `meta` stores) with localStorage fallback. All article storage functions are async (return Promises).
- localStorage: theme (`darkMode`), sidebar width/collapsed/pinned, reading speed (`readingWpm`), reading progress per article (`readProgress:{slug}`). Also holds `idb_migrated` flag and fallback article data (`article:{slug}`, `articleSlugs`).

## Renderer features

The renderer auto-applies these when rendering markdown in `lib/app.js`:

- **Syntax highlighting** — fenced code blocks with language tags (highlight.js, GitHub theme)
- **Mermaid diagrams** — `` ```mermaid `` blocks → SVG
- **Evidence tags** — `[Std]`, `[Standard]`, `[Inference]`, `[Platform]`, `[Library]`, `[Vendor]` → colored badge pills (see `TAG_MAP` in app.js)
- **Link chips** — external URLs → preview chips with favicons
- **Table styling** — headers, row hover, horizontal scroll
- **Dark mode** — system preference detection, persisted in localStorage
- **TOC** — collapsible tree from h2–h4 (h1 excluded to avoid duplication), scroll-spy, master-detail sidebar navigation
- **Reading time** — adaptive estimate that learns reading speed
- **Reading progress** — per-article scroll position stored in localStorage, progress bars in article list, percentage in header
- **Auto-hiding header** — hides on scroll down, reveals on scroll up, always visible near page top
- **Conditional header title** — shows filename-based title only when article h1 is scrolled out of view
- **Sidebar pin** — pinned (default) keeps sidebar open; unpinned auto-closes on content click
- **Article search** — search within article content from sidebar, results shown as highlighted snippets under TOC headings
- **YAML front matter** — `---` blocks stripped before rendering
- **Article import** — file picker (`.md` files), stored in IndexedDB (localStorage fallback)
- **Article delete** — trash button in detail header with confirmation
- **IndexedDB storage** — articles stored in IndexedDB for larger capacity; automatic one-time migration from localStorage; transparent fallback if IndexedDB is unavailable

When adding renderer features, update this list and the matching section in README.md.

## Articles

Imported via the `+` button in the sidebar toolbar. Articles are stored in IndexedDB (`aiResearchReader` database, `articles` store keyed by slug, `meta` store for the slugs list). Falls back to localStorage if IndexedDB is unavailable. Existing localStorage articles are migrated to IndexedDB automatically on first load (flag: `idb_migrated`). No server-side storage.

Filenames: lowercase kebab-case (e.g., `network-proxies.md`). The filename becomes the slug and sidebar title.

See `prompts/formatting-rules.md` for the AI prompt that produces correctly structured articles.

## Git workflow

Commit after every meaningful change.

Before committing, bring **all** relevant docs up to date — this is a hard rule, not a suggestion:
- `CLAUDE.md` — file structure, constraints, conventions, renderer features
- `README.md` — setup, usage, features, file structure
- `prompts/formatting-rules.md` — if the article generation prompt should reflect new capabilities

Commit format: `<type>: <short description>` (e.g., `feat: collapsible TOC tree`, `fix: evidence tag mapping`, `docs: update CLAUDE.md`).
