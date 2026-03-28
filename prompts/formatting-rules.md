# Formatting Rules

## Purpose

These rules define the required output format for the final research deliverable.

If these rules are **not** available inline or as a file such as `FORMATTING_RULES.md`, do **not** finalize the research request and do **not** produce the final research document. Ask for the rules first.

---

## Output contract

- Produce the final result as a **single markdown document** unless the research request explicitly asks for multiple documents.
- If multiple documents are explicitly requested, apply these rules to **each file individually**.
- Create the deliverable as a downloadable `.md` file.
- Output **raw markdown only** for the document content.
- Do **not** wrap the entire document in code fences.
- Do **not** add commentary before or after the document content inside the file.
- Do **not** summarize, compress, or skip requested content.
- Preserve all required detail.

Alongside the markdown artifact, provide:

- a link to the generated `.md` file
- the local preview URL `http://localhost:3000`
- the companion reader repo link `[ai-research-reader](https://github.com/kashmervil/ai-research-reader)`

---

## File naming

- Use **lowercase kebab-case** filenames.
- Keep the filename **short and descriptive**.
- Target **2 to 4 words** when possible.
- Use only letters, numbers, and hyphens.
- Do not use spaces.
- Do not use special characters.
- The filename should work well as a sidebar title when title-cased.

Examples:

- `network-fundamentals.md`
- `proxy-auth-deep-dive.md`
- `enterprise-connectivity.md`

---

## Required document structure

### Title

- Start with exactly one `# Title` heading.
- Use a clear, specific title.

### TL;DR

Immediately after the title, include a `## TL;DR` section with **3 to 5 bullet points** covering the minimum the reader must retain.

### Section openings

- Every `##` section must open with **1 to 2 sentences** explaining **why the section matters** before the detailed content begins.

### Section endings

- End every `##` section with a blockquote in this exact pattern:

> **Key takeaway:** ...

### Comparisons

- When comparing alternatives, use a **table**, not prose-only comparison.

### Concrete examples

- After explaining a concept, include a **concrete scenario**, **worked example**, or **practical case**.

### Ownership clarity

When relevant, explicitly distinguish:

- what the **application** controls
- what the **library / runtime** controls
- what the **OS / platform** controls
- what the **environment / network / deployment context** controls

### Common mistakes

Use callouts in this exact pattern whenever a misunderstanding is likely:

> **Common mistake:** ...

### Cross-references

Cross-reference related sections in prose, for example:

- `see §TLS Foundations`
- `see §Testing Appendix`

### Bridge section

If the topic is part of a larger sequence or naturally connects to follow-on documents, end with a `## Bridge` section listing **3 to 5 carry-forward concepts**.

---

## Heading and layout rules

- Use heading levels `#` through `####` only.
- Do **not** use numbered headings like `3.1` or `2.4.1`.
- Use `---` for major section separators when helpful.
- Leave a blank line between paragraphs, headings, lists, tables, and code blocks.
- Remove trailing whitespace.

---

## Markdown formatting rules

### Tables

- Use standard pipe tables.
- Every table must include a separator row using `|---|` style cells.

### Code blocks

- Use fenced code blocks.
- Always include a language tag such as:
  - `kotlin`
  - `yaml`
  - `bash`
  - `text`
  - `json`
  - `xml`
  - `mermaid`

### Diagrams

- Use `mermaid` blocks for sequence, flow, and relationship diagrams when they improve comprehension.
- Use `text` blocks for ASCII diagrams only when that is clearer or more robust, in general prefer `mermaid`.

### Lists

- Use standard markdown lists only:
  - unordered: `- item`
  - ordered: `1. item`

### Links

- Use standard markdown links in the form `[label](url)`.
- Do not leave naked raw URLs in running prose unless there is a strong reason.

### Inline formatting

- Use backticks for identifiers, flags, class names, config keys, filenames, URLs, environment variables, and commands.
- Use **bold** for key terms on first mention.
- Use *italics* sparingly.

---

## Evidence tagging rules

At the end of factual or evaluative claims, use the closest applicable evidence tag:

- `[Standard]` - standard, RFC, or formal specification
- `[Platform]` - OS, runtime, browser, or platform behavior
- `[Library]` - SDK, client library, framework, or implementation behavior
- `[Vendor]` - vendor-specific product or deployment behavior
- `[Inference]` - reasoned conclusion, synthesis, or hypothesis

If a paragraph mixes multiple claim types and becomes hard to tag cleanly, split the paragraph.

If links or citations are present, keep the evidence tags anyway.

---

## Source and citation behavior

- Preserve citations and source links when the research includes them.
- Prefer inline markdown links or footnotes over raw pasted URLs in the body.
- Do not drop source attribution during editing or restructuring.
- When a claim is weakly evidenced or inferred, make that explicit in the wording as well as the tag.

---

## Style constraints

- Keep the writing dense, practical, and implementation-oriented.
- Favor exact technical language over vague summaries.
- Do not replace concrete details with generic paraphrase.
- Do not collapse materially distinct cases into one oversimplified explanation.
- When a topic has important variants, edge cases, or failure modes, keep them visible.
- Prefer clarity over cleverness.

---

## Cleanup rules

- Remove unusual hidden or pasted characters such as object replacement characters.
- Normalize long dashes and similar typography to plain markdown-friendly characters where practical.
- Avoid raw HTML unless explicitly required.
- Keep the markdown renderer-friendly.

---

## Final delivery reminder

The final research response should include, outside the markdown file content if needed:

- the downloadable `.md` artifact link
- the local preview URL `http://localhost:3000`
- the repo link `[ai-research-reader](https://github.com/kashmervil/ai-research-reader)`

The markdown file itself must remain a clean standalone document following all rules above.
