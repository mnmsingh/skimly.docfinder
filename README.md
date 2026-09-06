# skimly.docfinder

A static, client-side web application for searching inside uploaded documents (PDF, Word). All parsing, indexing, and searching happen entirely in the browser — there is no backend, and uploaded files are never sent anywhere.

The UI is available in English, Hindi, and Marathi (switchable at any time), and documents can be in any of the three languages — search works the same way regardless of script.

## Tech Stack
- React + TypeScript
- Vite
- Tailwind CSS
- [pdf.js](https://mozilla.github.io/pdf.js/) — PDF text/page extraction
- [mammoth.js](https://github.com/mwilliamson/mammoth.js) — `.docx` text extraction
- [MiniSearch](https://github.com/lucaong/minisearch) — client-side full-text search index
- [Tesseract.js](https://tesseract.projectnaptha.com/) — OCR fallback for scanned PDFs with no text layer

## Getting Started

```bash
npm install
npm run dev
```

Other scripts:
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint
- `npm run vendor:tesseract` — refresh the vendored OCR assets (see below)

## Vendored assets

`public/pdfjs/` and `public/tesseract/` hold binary assets that pdf.js and
Tesseract.js would otherwise fetch from a public CDN at runtime. They're
committed so the app makes no third-party requests while reading a document —
a CDN request for `mar.traineddata` would leak what kind of file is being read,
and the app promises nothing leaves the user's device.

`public/tesseract/` is regenerated with `npm run vendor:tesseract`, which copies
the WebAssembly cores out of `node_modules/tesseract.js-core` and downloads the
`4.0.0_fast` trained data for English, Hindi, and Marathi. Re-run it after
upgrading `tesseract.js` or `tesseract.js-core`.

## Deployment

**Live at https://mnmsingh.github.io/skimly.docfinder/**

Static build via Vite, published to GitHub Pages by
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) on every push
to `main` (or manually via *Actions → Deploy to GitHub Pages → Run workflow*).
No environment variables or secrets are required — there is no backend, and
`GITHUB_TOKEN` is provided automatically.

The workflow uses the *Pages from GitHub Actions* source, so the built site is
uploaded as an artifact and never committed to a `gh-pages` branch. Before
publishing it checks two things that would otherwise only surface once someone
opened the live site: that `dist/index.html` still references
`/skimly.docfinder/`, and that the vendored Tesseract assets actually shipped.

### If you rename or fork the repository

`base` in [`vite.config.ts`](./vite.config.ts) must match the repository name,
because a GitHub Pages project site is served from
`https://<user>.github.io/<repo>/`. Change the repo name without changing
`base` and the page will load while every asset 404s — the workflow's asset
base-path check is there to catch exactly that. Hosting anywhere that serves
from a domain root (Netlify, Cloudflare Pages, Vercel, S3) instead needs
`base: '/'`.

Note the repo carries ~15 MB of vendored binaries in `public/`, so CI checkout
is slower than the source size alone suggests.

## Project Docs

See [CLAUDE.md](./CLAUDE.md) for development principles and coding standards, [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the feature roadmap, and [TASKS.md](./TASKS.md) / [PROGRESS.md](./PROGRESS.md) for current status.
