/**
 * Progress of parsing one file, reported while its `ProcessedDocument`
 * status is 'parsing'. Only produced by the PDF parser today — DOCX
 * parsing has no per-page concept and finishes quickly enough not to need
 * incremental progress.
 */
export interface ParseProgress {
  /**
   * During 'reading', the 1-based number of the page just read. During
   * 'ocr', how many scanned pages have been recognized so far — a count
   * rather than a page number, because scanned pages are recognized several
   * at a time and finish out of order.
   */
  page: number
  /**
   * During 'reading', the document's total page count. During 'ocr', how
   * many of those pages need recognizing — usually far fewer.
   */
  totalPages: number
  /**
   * 'reading' while the document's text layers are being extracted. 'ocr'
   * once that's done and the pages that had no extractable text (scanned or
   * image-only pages) are being recognized with Tesseract.js instead, which
   * is much slower.
   */
  phase: 'reading' | 'ocr'
}
