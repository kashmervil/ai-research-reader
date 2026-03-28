# AI Research Reader

A local single-page reader for AI-generated research articles.

AI chat apps are poor at displaying long-form research — output gets buried in threads, formatting is limited, diagrams don't render. This reader takes `.md` files and presents them as polished, navigable web pages.

## Quick start

```bash
git clone <this-repo> ai-research-reader
cd ai-research-reader
mkdir -p articles
# drop .md files into articles/
python3 -m http.server -b 127.0.0.1 3000
# open http://localhost:3000
```

No npm, no build step, no dependencies to install. Just Python 3.

## How to use

### 1. Generate an article

Append `prompts/formatting-rules.md` to your research prompt (select all → copy → paste). It tells the AI to output a downloadable `.md` file with proper structure, tables, code blocks, diagrams, and evidence tags.

For a guided research workflow, use `prompts/research-prompt-factory.md` as a system prompt — it interviews you and builds a precise research request for a stronger model.

### 2. Drop the file

Save the `.md` file into `articles/`. Naming: lowercase kebab-case, 2–4 words (e.g., `network-fundamentals.md`). The filename becomes the sidebar title.

### 3. Serve and read

```bash
python3 -m http.server -b 127.0.0.1 3000
```

Articles are auto-discovered from `articles/` on page load.

## Features

- **Markdown rendering** — full GFM via marked.js with syntax-highlighted code blocks (highlight.js, GitHub theme)
- **Mermaid diagrams** — `mermaid` fenced blocks render as interactive SVGs
- **Light / dark theme** — toggle with system preference detection, persisted across sessions
- **Master-detail sidebar** — article list → collapsible TOC tree (h1–h4) with back navigation
- **Scroll-spy** — TOC highlights current section, auto-expands ancestors
- **Resizable sidebar** — drag handle, width persisted in localStorage
- **Evidence tags** — `[Std]`, `[Standard]`, `[Inference]`, `[Platform]`, `[Library]`, `[Vendor]` → colored badge pills
- **Link preview chips** — external URLs become chips with site favicons
- **Adaptive reading time** — estimates remaining time, learns your reading speed
- **URL routing** — `#article-name/heading-N` format, shareable heading links
- **YAML front matter** — stripped automatically before rendering
- **Responsive layout** — mobile/tablet with collapsible sidebar overlay
- **Zero build step** — static files over HTTP, no npm, no bundler

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
lib/app.js                      — all logic: loader, renderer, TOC, scroll-spy
lib/marked.min.js               — markdown parser (v4.3.0)
lib/highlight.min.js            — syntax highlighting (v11.11.1)
lib/mermaid.min.js              — diagram rendering (v11.13.0)
lib/highlight-github.css        — GitHub syntax theme
lib/fonts/                      — JetBrains Mono (woff2)
prompts/
  formatting-rules.md           — copy-paste formatting prompt for AI
  research-prompt-factory.md    — system prompt for research interview workflow
articles/                       — your .md files (gitignored)
```

## Security

The serve command binds to `127.0.0.1` (localhost only). Do not use `python3 -m http.server` without `-b 127.0.0.1` — the default binds to all interfaces.
