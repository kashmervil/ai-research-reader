# AI Research Reader — Claude Instructions

## Project overview

Zero-dependency static SPA for reading AI-generated research articles. No npm, no build step — pure static files suitable for GitHub Pages. Articles are stored in localStorage (imported via file picker).

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
lib/app.js                      — all logic: loader, renderer, TOC, scroll-spy, reading time, localStorage storage
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
- **No server required** — all article storage in localStorage, works on GitHub Pages
- **Vendored libs** — in `lib/`, no npm packages, no CDN links
- **marked.js v4.3.0** — incompatible with v5+/v15; keep vendored version

## Code conventions

- Vanilla JS (ES6+), no frameworks
- Single JS entry: `lib/app.js`
- CSS custom properties for theming (`data-theme` on `<html>`)
- localStorage: theme, sidebar width, reading speed, reading progress per article, sidebar pinned state, article content (`article:{slug}`), article list (`articleSlugs`)

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
- **Article import** — file picker (`.md` files), stored in localStorage
- **Article delete** — trash button in detail header with confirmation

When adding renderer features, update this list and the matching section in README.md.

## Articles

Imported via the `+` button in the sidebar toolbar. Articles are stored entirely in `localStorage` (keys: `article:{slug}` for content, `articleSlugs` for the list). No server-side storage.

Filenames: lowercase kebab-case (e.g., `network-proxies.md`). The filename becomes the slug and sidebar title.

See `prompts/formatting-rules.md` for the AI prompt that produces correctly structured articles.

## Git workflow

Commit after every meaningful change.

Before committing, bring **all** relevant docs up to date — this is a hard rule, not a suggestion:
- `CLAUDE.md` — file structure, constraints, conventions, renderer features
- `README.md` — setup, usage, features, file structure
- `prompts/formatting-rules.md` — if the article generation prompt should reflect new capabilities

Commit format: `<type>: <short description>` (e.g., `feat: collapsible TOC tree`, `fix: evidence tag mapping`, `docs: update CLAUDE.md`).
