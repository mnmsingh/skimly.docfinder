# CLAUDE.md

## Repository Purpose
This repository contains **skimly.docfinder** — a static, client-side web application that lets users upload documents (PDF, Word) in the browser and search across them, returning the page reference and a matching text extract for each result.

There is **no backend**. All file parsing, indexing, and searching happens client-side in the browser. The app is deployed as static files to **GitHub Pages**.

---

## Tech Stack
- React
- TypeScript
- Vite
- Tailwind CSS
- **pdf.js** — extract text + page numbers from uploaded PDF files
- **mammoth.js** — extract text from uploaded Word (`.docx`) files
- A client-side search/indexing approach (e.g. a lightweight custom index, or a library such as `lunr.js`/`minisearch`) suited to handling large documents (100+ pages) without blocking the UI — evaluate using a **Web Worker** for parsing/indexing so the main thread stays responsive.

No server, no database, no backend framework. Everything runs in the user's browser; uploaded files are never sent anywhere.

---

## Development Principles
- Build **one feature at a time**.
- Prefer simple, maintainable code.
- Avoid over-engineering.
- Keep the architecture extensible.
- Reuse existing components whenever possible.
- Never create placeholder features.

---

## Mandatory Startup (Every Session)
Read the following files before coding:
1. README.md
2. PROJECT_PLAN.md
3. TASKS.md
4. PROGRESS.md
5. CHANGELOG.md
6. CHAT_LOG.md

If a file does not exist, create it.
Review unfinished tasks and continue the highest-priority item.

---

## Coding Workflow
Before coding:
- Understand the task.
- Identify impacted files.
- Briefly explain the implementation approach.

After coding:
- Ensure the project builds successfully.
- Fix lint/type errors introduced.
- Update documentation.

---

## Session Closeout
Always update:
- PROGRESS.md
- TASKS.md
- CHANGELOG.md
- CHAT_LOG.md

Record:
- Completed work
- Files modified
- Next task
- Known issues

Stop after updating documentation.

---

## Coding Standards
- Use TypeScript.
- Avoid `any`.
- Prefer functional components.
- Keep components small and reusable.
- Move reusable logic into hooks.
- Use meaningful names.
- Avoid duplicate code.
- Keep file-parsing, indexing, and search logic isolated in their own modules/hooks (e.g. `usePdfParser`, `useDocxParser`, `useSearchIndex`) — never inline heavy parsing logic inside components.
- For large documents (100+ pages), prefer streaming/incremental parsing and indexing over blocking, all-at-once processing. Offload this work to a Web Worker where practical.

### Documentation Comments
- Document every exported function, hook, component, and type/interface with a JSDoc comment (`/** ... */`, with `@param` / `@returns` where relevant).
- **Write for a junior developer with no prior context on this codebase** — someone who could read the doc comment and correctly use (or safely modify) the code without having to read its implementation first:
  - Component/hook-level JSDoc states what it *is* and what role it plays (e.g. "Parses an uploaded PDF file into per-page text chunks for indexing" not just "PDF parser").
  - Method/function-level JSDoc states what happens when it's called, in plain language — spell out acronyms/library-specific terms on first use in a file.
  - Document every parameter (`@param`) and return value (`@returns`) — even when the type name seems self-explanatory, say what it represents or what values are valid.
  - Document thrown errors/rejected promises whenever a function can fail in a way a caller needs to handle (e.g. corrupt file, unsupported format, empty document).
- A short one-liner is fine for simple, obviously-named components/types; give fuller multi-sentence JSDoc to anything with non-trivial logic (file parsing, indexing, search ranking, worker communication).
- Doc comments describe *what the export does and its contract* (params, return value, side effects, errors) — not the WHY (that belongs inline per the general no-comments-unless-non-obvious rule), except where the WHY is itself part of the contract a caller/maintainer must know.
- Internal/unexported helpers don't need doc comments unless their behavior is non-obvious.

---

## File Handling Rules
- Never upload or transmit user files to any server — all processing stays in the browser.
- Support at minimum: PDF (`.pdf`) and Word (`.docx`).
- Handle large files (100+ pages) without freezing the UI: show progress/loading state during parsing and indexing.
- Handle corrupt, password-protected, or unsupported files gracefully with a clear error message — never fail silently.
- Clear parsed data/memory when a user removes a file or starts a new session, to avoid unbounded memory growth across large documents.

---

## Search & Results Rules
- Every search result must include: the source file name, the page number (PDF) or approximate location (Word), and a short text extract showing the match in context.
- Highlight the matched term within the extract.
- Handle empty/no-match states clearly in the UI.
- Search should feel responsive even with multiple large documents loaded — debounce input and avoid re-indexing unnecessarily.

---

## UI Rules
- Responsive for desktop, tablet and mobile browsers.
- Follow accessibility best practices.
- Keep UI clean and consistent.
- Clearly show upload progress, parsing progress, and indexing status separately, since large files may take a few seconds to process.

---

## Deployment
- Static build via Vite, deployed to **GitHub Pages**.
- Deployment should be automated via a GitHub Actions workflow that builds the Vite project and publishes the output to the `gh-pages` branch (or the `docs/` folder / Pages source, whichever is configured) on push to the main branch.
- No environment variables or secrets are required for core functionality, since there is no backend.

---

## Scope
Do NOT generate:
- Any backend code/scaffold (Spring Boot, Node, Python, etc.) — this app has no backend.
- Android code
- iOS code

unless explicitly requested and confirmed first.

---

## Git
Use commit prefixes:
- feat:
- fix:
- refactor:
- docs:
- test:
- chore:

When the user says **"commit work"** (or a clear equivalent), create a git commit for the current
changes: review `git status`/`git diff`, stage the relevant files, and commit with a message using
the prefixes above. If this directory isn't a git repository yet, ask before running `git init`.

---

## If Requirements Are Unclear
Do not guess.
Ask for clarification before implementation.
