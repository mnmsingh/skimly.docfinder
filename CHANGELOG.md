# Changelog

All notable changes to this project are documented here.

## [Unreleased]
### Added
- Initial project scaffold: Vite + React + TypeScript + Tailwind CSS.
- Core dependencies: `pdfjs-dist`, `mammoth`, `minisearch`.
- Mandatory project docs: README, PROJECT_PLAN, TASKS, PROGRESS, CHANGELOG, CHAT_LOG.
- Git repository initialized.
- File upload UI: drag-and-drop + click-to-browse dropzone, file list with per-file validation errors, PDF/DOCX type and 100 MB size validation (`useFileUpload`, `FileDropzone`, `FileList`).
- Design-token system in `tailwind.config.js` (primary/surface/background/border/muted/success/warning/error) and reusable `.btn`/`.card`/`.badge` component classes in `index.css`.
- Custom SVG favicon and meta description/theme-color in `index.html`.

### Changed
- Redesigned `App`, `FileDropzone`, and `FileList` for visual polish, clearer hierarchy, and consistency: icon-mark header, upload icon and helper text on the dropzone, PDF/DOCX type badges and icon remove buttons on file rows, a richer empty state, and a footer. No functional/behavioral changes and no new runtime dependencies.

### Added
- Full-text search: `usePdfParser` (per-page PDF text via pdf.js), `useDocxParser` (per-paragraph DOCX text via mammoth.js), `useDocumentIndex` (per-file parsing orchestration and status tracking), `useSearchIndex` (MiniSearch-backed full-text search with prefix/fuzzy matching), `useDebouncedValue`, and `lib/snippet.ts` (match highlighting). New `SearchBar` and `SearchResults` components. `FileList` now shows per-file parsing/indexing progress and parse errors (e.g. corrupted or password-protected PDFs) in addition to validation errors.

### Changed
- `pdfjs-dist` and `mammoth` are now imported dynamically inside their respective parser hooks instead of at module scope, so their code is only downloaded once a user uploads a matching file type — keeps the initial bundle lightweight.

### Fixed
- The search input was `disabled` until a document finished indexing, which made it look non-editable/broken if parsing was slow or failed. It's now always editable; readiness is communicated via `SearchResults`' messaging instead.

### Added
- Light/dark theme toggle (`useTheme`, `ThemeToggle`), persisted to `localStorage` with no flash of the wrong theme on load (an inline script in `index.html` applies it before first paint).

### Changed
- Design tokens (`primary`/`surface`/`background`/`border`/`muted`/`success`/`warning`/`error`) are now backed by CSS custom properties instead of fixed hex values, so they automatically repaint per-theme; `.dark` in `index.css` redefines them. The separate `-light` tint tokens were removed in favor of Tailwind's opacity modifier (e.g. `bg-primary/10`), which derives an appropriate tint in either theme from the same base color.

### Added
- Visible search button in `SearchBar`, wrapped in a `<form role="search">` so it's submittable by click or Enter (search itself still runs live via the existing debounce).
- Multilingual UI: English/Hindi/Marathi, via a hand-written translation dictionary (`src/i18n/translations.ts`), `useLanguage` hook, and `LanguageSwitcher` component. All components now accept a `t` translation function instead of hardcoding English strings.
- PDF/DOCX search support for Hindi and Marathi document content: `usePdfParser` now configures pdf.js's `cMapUrl`/`cMapPacked`/`standardFontDataUrl` (assets vendored into `public/pdfjs/`) so PDFs using non-embedded/composite font encodings extract correctly, and reconstructs page text with a position/EOL-aware join instead of a naive space-join, since Devanagari PDFs commonly report one text item per glyph-cluster rather than per word.

### Changed
- `UploadedFile`/`ProcessedDocument` now store `errorKey`/`errorParams` (a translation key + params) instead of a pre-formatted English `errorMessage`; `usePdfParser`/`useDocxParser`/`useFileUpload` throw/return a new `TranslatableError`/key instead of English `Error` messages, so error messages localize correctly.
- `DocumentChunk`/`SearchResult` now carry `locationType` ('page' | 'paragraph') + `location` (a number) instead of a pre-formatted `locationLabel` string, so the "Page N"/"Paragraph N" label is translated at render time and updates live when the UI language changes.

### Known limitations
- PDF text extraction for Devanagari script can occasionally drop or garble characters within complex conjunct clusters, depending on how the source PDF's font was embedded/subset — this is inherent to the source PDF's font-to-Unicode mapping and isn't fixable in client-side extraction code. DOCX is unaffected.

### Added
- OCR fallback for scanned/image-only PDF pages (`tesseract.js`, `eng`+`hin`+`mar`), for documents like government forms and voter rolls that have no extractable text layer. New `ParseProgress` type reports per-page status.

### Fixed
- The per-page parsing/OCR progress (`ParseProgress`) was computed by `usePdfParser` but never reached the UI — `useDocumentIndex` didn't pass an `onProgress` callback and `FileList` didn't render it — so a slow parse (especially OCR) showed a static spinner with no indication of progress. Now shows "Reading page X of Y…" / "Scanned page X of Y — recognizing text…" live, in all three UI languages.

### Changed
- `OCR_RENDER_SCALE` trimmed from 2.5 to 2 for a real (if modest) OCR speed improvement. (No faster official Tesseract trained-data variant exists to switch to — verified against the actual CDN package contents before assuming one did.)

### Changed
- **OCR of scanned PDFs is roughly 3x faster.** Measured on eight dense,
  voter-roll-shaped Devanagari pages: **24.8s → 7.5s** end to end (recognition
  alone 21.3s → 7.1s, worker start-up 3.4s → 0.4s). Three changes combined:
  - OCR now runs across a pool of workers (`Tesseract.createScheduler`, sized
    to `hardwareConcurrency - 1`, capped at 4) instead of one worker handling
    pages strictly one at a time. This is the largest single win.
  - Switched to the `4.0.0_fast` trained data instead of the `4.0.0_best_int`
    default. Devanagari output was byte-identical to `best_int` on the test
    fixtures, and the files are ~35% smaller.
  - `'auto'` language detection: the first scanned page is recognized in all
    three languages at once and the highest-confidence one wins the rest of the
    document, rather than every page being read in all three. Worth ~14% —
    less than expected, since most of a page's cost is layout analysis rather
    than running each language's model.
- Tesseract's WebAssembly cores and trained data are now vendored into
  `public/tesseract/` (via `npm run vendor:tesseract`) and served same-origin.
  OCR previously fetched ~10 MB from jsDelivr at runtime, which was both slow
  on a cold cache and a third-party request revealing which language pack — and
  therefore what kind of document — was being read.
- `usePdfParser` now parses in two passes: all text layers first, then the
  pages that had none. The OCR worker pool starts as soon as the first such
  page is found, so its start-up overlaps with reading the remaining text
  layers instead of blocking on the first scanned page.
- Scanned pages are rendered to a target 150 DPI with a 4-megapixel ceiling,
  replacing the fixed 2x scale. Typical A4 pages render as before; oversized
  pages (fold-out maps and plans, common in scanned government documents) no
  longer render into bitmaps large enough to stall the tab.
- Blank scanned pages are detected and skipped rather than sent to OCR.
- `ParseProgress` during the `'ocr'` phase now counts recognized pages out of
  the pages needing OCR, rather than reporting a page number — pages are
  recognized several at a time and finish out of order. The existing
  translated progress string reads correctly either way.

### Added
- "Scanned document language" selector (`OcrLanguageSelect`, `useOcrLanguage`,
  persisted to `localStorage`): Detect automatically (default) / English /
  हिन्दी / मराठी / Mixed. Only affects scanned PDFs; naming the language skips
  the detection pass.
- `scripts/vendor-tesseract.mjs` + `npm run vendor:tesseract`, so the vendored
  OCR assets can be regenerated after a dependency upgrade.

### Fixed
- A Devanagari-only OCR model mangles the Latin text that Hindi and Marathi
  documents routinely contain — voter ID codes, place names, form numbers.
  ("zebrafish checkpoint marker" came back as "76९0171150 (6८६७ प्रोबट्श".)
  Devanagari documents are now always recognized with English alongside, which
  measured at ~3% slower and restored the Latin text exactly.

### Corrected
- A previous entry claimed no faster official Tesseract trained-data variant
  existed. One does: `https://tessdata.projectnaptha.com/4.0.0_fast`, which
  Tesseract.js's own `docs/performance.md` recommends. The earlier check looked
  only at the `@tesseract.js-data` npm packages, which don't carry it.
