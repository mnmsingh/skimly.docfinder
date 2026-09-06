/**
 * Which language(s) OCR should recognize a scanned document in.
 *
 * - `'auto'` — figure it out from the document's first scanned page (see
 *   `createOcrPool` in `lib/ocr.ts`). The default, and the right choice
 *   unless the guess turns out wrong.
 * - `'eng'` / `'hin'` / `'mar'` — recognize that language (paired with
 *   English, for the Latin text Devanagari documents usually also contain).
 *   Skips the detection pass `'auto'` has to run.
 * - `'mixed'` — recognize all three at once. The slowest option, though by
 *   less than you'd expect — most of a page's cost is layout analysis, not
 *   running each language's model — and the safest for a document that
 *   genuinely switches script partway through.
 *
 * This lives apart from `lib/ocr.ts` on purpose: the UI needs the type and
 * the list of options, but importing them from `lib/ocr.ts` would pull
 * Tesseract.js (~500 KB) into the initial bundle, when it should only load
 * for a document that actually needs OCR.
 */
export type OcrLanguagePreference = 'auto' | 'eng' | 'hin' | 'mar' | 'mixed'

/** Every `OcrLanguagePreference` value, in the order a picker should list them. */
export const OCR_LANGUAGE_PREFERENCES: readonly OcrLanguagePreference[] = [
  'auto',
  'eng',
  'hin',
  'mar',
  'mixed',
]
