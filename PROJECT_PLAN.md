# Project Plan

## Goal
A static, client-side app where a user uploads PDF/Word documents and searches across them, getting back a page reference and a matching text extract per result. No backend; everything runs in the browser.

## Feature Roadmap (build one at a time)

1. **Project scaffold** — Vite + React + TypeScript + Tailwind, deployable to GitHub Pages.
2. **File upload UI** — select/drag-drop one or more PDF/DOCX files, with validation of accepted types.
3. **PDF parsing** (`usePdfParser`) — extract per-page text via pdf.js.
4. **DOCX parsing** (`useDocxParser`) — extract text via mammoth.js, with approximate location tracking (no native page concept in `.docx`).
5. **Parsing progress/state UI** — per-file upload/parsing/indexing status, error states for corrupt/password-protected/unsupported files.
6. **Search index** (`useSearchIndex`) — build a MiniSearch index from parsed documents; keep parsing/indexing off the main thread via a Web Worker once documents get large.
7. **Search UI** — debounced search input, results list showing file name, page/location, and a highlighted text extract.
8. **Empty/no-match states** — clear UI feedback when there are no documents or no results.
9. **Memory cleanup** — clear parsed data/index when a file is removed or a new session starts.
10. **Responsive/accessibility pass** — verify layout across desktop/tablet/mobile and basic a11y (labels, focus, contrast).
11. **GitHub Pages deployment** — GitHub Actions workflow to build and publish on push to `main`.

## Out of Scope (unless explicitly requested)
- Any backend/server code
- Android or iOS native code
- File formats beyond PDF and DOCX (for the initial scope)

## Status
See [TASKS.md](./TASKS.md) for the current task breakdown and [PROGRESS.md](./PROGRESS.md) for what's been completed.
