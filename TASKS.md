# Tasks

Tracks the current task breakdown. Update as work progresses — check items off, add new ones as they're discovered.

## Done
- [x] Scaffold Vite + React + TypeScript + Tailwind project
- [x] Add core dependencies: pdfjs-dist, mammoth, minisearch
- [x] Build file upload UI (drag-drop + file picker, PDF/DOCX validation)
- [x] UI/UX beautification pass: design tokens, reusable button/card/badge primitives, redesigned header/dropzone/file list/empty state, custom favicon, responsive + accessibility check

## Done (continued)
- [x] Implement `usePdfParser` hook (pdf.js text + page extraction)
- [x] Implement `useDocxParser` hook (mammoth.js text extraction)
- [x] Add per-file upload/parsing/indexing progress and error states
- [x] Implement `useSearchIndex` hook (MiniSearch)
- [x] Build search UI (debounced input, results with file/page/highlighted extract)
- [x] Handle empty/no-match states
- [x] Clear parsed data/index on file removal or new session
- [x] Light/dark theme toggle with persistence and no flash-of-wrong-theme on load
- [x] Visible search button (form-wrapped `SearchBar`, submittable by click or Enter)
- [x] Multilingual UI: English/Hindi/Marathi switcher (`useLanguage`, `LanguageSwitcher`), all UI strings and error messages translated
- [x] PDF/DOCX search support for Hindi and Marathi document content (pdf.js CMaps/standard fonts, Unicode-safe text reconstruction, localized page/paragraph labels)
- [x] OCR fallback (Tesseract.js, eng+hin+mar) for scanned/image-only PDF pages with no extractable text layer — common for government forms like voter rolls
- [x] Wire up per-page parsing progress in the file list ("Reading page X of Y" / "Scanned page X of Y — recognizing text…") — the `ParseProgress` type and `usePdfParser` callback existed but nothing consumed them, so a slow (especially OCR) parse looked stuck with a static spinner and no feedback

- [x] OCR speed-up (~3x on dense scanned Devanagari pages): worker pool via `Tesseract.createScheduler`, `4.0.0_fast` trained data, per-document language detection, two-pass parsing so pool start-up overlaps text extraction, DPI-based render sizing with a pixel cap, blank-page skip
- [x] Vendor Tesseract's wasm cores + trained data into `public/tesseract/` (`npm run vendor:tesseract`) so OCR makes no CDN requests
- [x] "Scanned document language" selector (Auto / English / हिन्दी / मराठी / Mixed) as an override for the auto-detection

## Up Next (highest priority first)
- [ ] Responsive + accessibility pass over the new search UI specifically, now including the new `OcrLanguageSelect` control (spot-checked during build; no formal a11y audit yet)
- [ ] Set up GitHub Actions workflow for GitHub Pages deployment. Note the repo now carries ~15 MB of vendored binaries in `public/` — check this stays within Pages' limits and doesn't slow the workflow unacceptably
- [ ] Evaluate moving pdf.js *text extraction and page rendering* to a Web Worker. OCR itself now runs off the main thread, but rendering a scanned page to a canvas still doesn't (pdf.js needs a real canvas; `OffscreenCanvas` would be the route)
- [ ] Re-measure against the user's real 39-page Maharashtra voter roll. The 3x figure comes from a synthetic dense fixture; a real scan (noise, skew, photos) may behave differently, and it's the document the complaint originated from

## Known Issues
- Text-layer parsing and page rendering still run on the main thread (OCR itself no longer does). Async/await yields between pages, so the UI stays responsive for typical documents, but a very large PDF could still cause brief jank.
- PDF text extraction for Devanagari (Hindi/Marathi) can occasionally drop or garble characters in complex conjunct clusters (e.g. "गरुड़" → "गड़"), depending on how the source PDF's font was embedded/subset by whatever tool created it — this traces back to the PDF's own font-to-Unicode mapping, not something fixable in client-side extraction code. Simple/common words are unaffected. DOCX (Word) extraction has no such issue since it stores plain Unicode text directly.
- OCR of scanned PDFs is still the slowest thing the app does — it's a full page render plus Tesseract.js recognition, entirely on the CPU in the browser (no server, no GPU). It's now roughly 3x faster than it was (measured 24.8s → 7.5s over eight dense voter-roll-shaped Devanagari pages), but a many-page scanned document still takes tens of seconds. Progress is shown per page throughout.
- Forcing a specific document language that the document isn't in loses that document's text entirely (e.g. selecting English for a Marathi scan). That's the correct behavior for an explicit override, and why 'Detect automatically' is the default — but there's no warning when a forced choice yields almost nothing.

### Corrected earlier notes
- A previous entry here claimed no faster official Tesseract trained-data variant existed and that `best_int` was already the fastest option. That was wrong: `https://tessdata.projectnaptha.com/4.0.0_fast` exists and is recommended in Tesseract.js's own `docs/performance.md`. The earlier check looked only at the `@tesseract.js-data` npm packages, which don't carry it. The app now uses it, and Devanagari output was byte-identical to `best_int` on the test fixtures.
