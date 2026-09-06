import { useCallback } from 'react'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import type { DocumentChunk } from '../types/documentChunk'
import type { ParseProgress } from '../types/parseProgress'
import type { OcrPool } from '../lib/ocr'
import type { OcrLanguagePreference } from '../types/ocrLanguage'
import { TranslatableError } from '../i18n/translatableError'

const NUL_CHAR = String.fromCharCode(0)

/**
 * Resolution scanned pages are rendered at before OCR. Tesseract's accuracy
 * depends heavily on input resolution, and pdf.js's natural scale of 1 is
 * roughly 72 DPI — far too low. Kept only as high as still gives reasonable
 * Devanagari accuracy, since recognition time scales with pixel count and is
 * by far the slowest part of parsing a scanned document.
 */
const OCR_TARGET_DPI = 150

/** PDF user-space units per inch — the basis for turning a DPI into a pdf.js scale. */
const PDF_UNITS_PER_INCH = 72

/**
 * Ceiling on the pixel count of a rendered page, regardless of DPI. Most
 * pages are A4 and land well under this, but scanned documents sometimes
 * carry an oversized page (a fold-out map or plan), which at a fixed scale
 * would render into a bitmap large enough to stall the tab on its own.
 */
const OCR_MAX_PIXELS = 4_000_000

/**
 * How many pages may be rendered and awaiting recognition at once. Rendering
 * happens on the main thread while recognition happens in the worker pool,
 * so a few pages in flight keep the pool fed; more than that just holds
 * bitmaps in memory for no gain.
 */
const OCR_PAGES_IN_FLIGHT = 6

/** Edge length of the thumbnail a page is sampled down to for the blank-page check. */
const BLANK_SAMPLE_SIZE = 64

/**
 * Fraction of sampled pixels that must match the page's most common shade
 * for it to count as blank. Deliberately strict — skipping OCR on a page
 * that did have faint content would silently lose searchable text.
 */
const BLANK_UNIFORM_RATIO = 0.995

/** How close two shades must be (0-255) to count as the same for blank detection. */
const BLANK_SHADE_TOLERANCE = 12

/**
 * Reconstructs a page's plain text from pdf.js's raw text items.
 *
 * For simple Latin-script PDFs, pdf.js typically reports one item per
 * line, so naively joining items with a space works fine. Devanagari (and
 * other complex-script) text renders very differently: fonts shape
 * conjuncts/matras per glyph-cluster, so a Hindi/Marathi PDF often has one
 * item per glyph-cluster instead of per word — inserting a space between
 * every item would then break every word apart (e.g. "बजट" -> "ब ज ट").
 *
 * The fix is to never insert our own separators: adjacent glyph-cluster
 * items belonging to the same word are already positioned edge-to-edge by
 * the PDF itself, an explicit space in the source text already arrives as
 * its own item (str: " "), and pdf.js flags the last item on a line with
 * `hasEOL` — so appending a single space only there reconstructs line
 * breaks without corrupting intra-word joins. A stray NUL character
 * (a font ligature-mapping artifact seen in some Devanagari PDFs) is
 * stripped as a defensive cleanup.
 */
function joinTextItems(items: Array<{ str: string; hasEOL?: boolean } | object>): string {
  let result = ''
  for (const item of items) {
    if (!('str' in item)) continue
    result += item.str
    if (item.hasEOL) result += ' '
  }
  return result.split(NUL_CHAR).join('').replace(/\s+/g, ' ').trim()
}

/**
 * Works out how much to magnify a page so it reaches `OCR_TARGET_DPI`,
 * backing off if that would exceed `OCR_MAX_PIXELS`.
 *
 * @param page - The page about to be rendered.
 * @returns A pdf.js viewport scale factor, always at least 1.
 */
function ocrRenderScale(page: PDFPageProxy): number {
  const { width, height } = page.getViewport({ scale: 1 })
  const dpiScale = OCR_TARGET_DPI / PDF_UNITS_PER_INCH
  const pixelCapScale = Math.sqrt(OCR_MAX_PIXELS / (width * height))
  return Math.max(1, Math.min(dpiScale, pixelCapScale))
}

/**
 * Reports whether a rendered page is effectively a single flat colour, and
 * so has nothing worth running OCR over.
 *
 * Scanned documents routinely include blank separator pages, and recognizing
 * one costs as much as recognizing a full page of text. The page is sampled
 * down to a thumbnail first, so the check itself is cheap.
 *
 * @param canvas - The rendered page.
 * @returns True only if virtually every sampled pixel is the same shade.
 */
function isBlankPage(canvas: HTMLCanvasElement): boolean {
  const sample = document.createElement('canvas')
  sample.width = BLANK_SAMPLE_SIZE
  sample.height = BLANK_SAMPLE_SIZE
  const context = sample.getContext('2d', { willReadFrequently: true })
  if (!context) return false

  context.drawImage(canvas, 0, 0, BLANK_SAMPLE_SIZE, BLANK_SAMPLE_SIZE)
  const { data } = context.getImageData(0, 0, BLANK_SAMPLE_SIZE, BLANK_SAMPLE_SIZE)

  const shades: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    shades.push((data[i] + data[i + 1] + data[i + 2]) / 3)
  }

  const reference = shades[0]
  const matching = shades.filter((shade) => Math.abs(shade - reference) <= BLANK_SHADE_TOLERANCE).length
  return matching / shades.length >= BLANK_UNIFORM_RATIO
}

/**
 * Renders one PDF page to an off-screen canvas and encodes it as a PNG for
 * the OCR pool.
 *
 * @param page - The pdf.js page to render.
 * @returns The rendered page as an image blob, or null if the page is blank
 * (nothing to recognize) or a canvas context couldn't be created.
 */
async function renderPageForOcr(page: PDFPageProxy): Promise<Blob | null> {
  const viewport = page.getViewport({ scale: ocrRenderScale(page) })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const context = canvas.getContext('2d')
  if (!context) return null

  try {
    await page.render({ canvasContext: context, viewport }).promise
    if (isBlankPage(canvas)) return null
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  } finally {
    // Free the bitmap immediately rather than waiting for GC — a document
    // with many large scanned pages can otherwise hold hundreds of MB.
    canvas.width = 0
    canvas.height = 0
  }
}

/**
 * Recognizes every page that had no text layer, several at a time.
 *
 * Pages are rendered on the main thread (pdf.js needs a real canvas) but
 * recognized in the worker pool, with a bounded number in flight so the pool
 * stays busy without piling up bitmaps. Results can arrive out of order, so
 * each page's text is written back into `pageTexts` by page number.
 *
 * @param pdf - The open document.
 * @param pageNumbers - Pages needing OCR, in ascending order.
 * @param pool - The OCR pool to submit rendered pages to.
 * @param pageTexts - Map that recognized text is written into, keyed by page number.
 * @param onPageDone - Called once per page finished, for progress reporting.
 */
async function recognizePages(
  pdf: PDFDocumentProxy,
  pageNumbers: number[],
  pool: OcrPool,
  pageTexts: Map<number, string>,
  onPageDone: () => void,
): Promise<void> {
  let cursor = 0

  const lane = async () => {
    for (let index = cursor++; index < pageNumbers.length; index = cursor++) {
      const pageNumber = pageNumbers[index]
      try {
        const page = await pdf.getPage(pageNumber)
        const image = await renderPageForOcr(page)
        page.cleanup()
        if (image) {
          const text = await pool.recognize(image)
          if (text) pageTexts.set(pageNumber, text)
        }
      } catch {
        // OCR failing on one page shouldn't fail the whole file — that page
        // just contributes no searchable text, same as before OCR existed.
      }
      onPageDone()
    }
  }

  const laneCount = Math.min(OCR_PAGES_IN_FLIGHT, pageNumbers.length)
  await Promise.all(Array.from({ length: laneCount }, lane))
}

/**
 * Extracts per-page text from a PDF file using pdf.js, entirely in the
 * browser. Each non-empty page becomes one `DocumentChunk`.
 *
 * pdf.js (a large library) is imported dynamically here rather than at
 * module scope, so its code is only downloaded once a user actually
 * uploads a PDF, keeping the initial page load lightweight.
 *
 * Documents may be in English, Hindi, or Marathi (or mixed). Many
 * real-world PDFs reference external character maps or one of the 14
 * standard fonts instead of embedding everything, which pdf.js needs
 * `cMapUrl`/`standardFontDataUrl` to resolve correctly — without them,
 * text using those encodings (common for Devanagari PDFs produced by
 * some tools) can come out garbled or empty. Those assets are vendored
 * from `pdfjs-dist` into `public/pdfjs/` and fetched lazily, only for a
 * PDF that actually needs them.
 *
 * Parsing runs in two passes. The first reads every page's text layer,
 * which is fast. Pages that come back empty are really scanned images
 * (common for government forms, like voter rolls), and are collected for a
 * second pass that renders and OCRs them through a pool of Tesseract.js
 * workers — several pages at a time, in whichever language the document
 * turns out to be written in. The pool is started as soon as the first such
 * page is seen, so its multi-megabyte engine and language data load while
 * the remaining text layers are still being read. A PDF with a text layer
 * throughout never loads Tesseract.js at all.
 *
 * @param file - The PDF file to parse.
 * @param fileId - Id of the corresponding `UploadedFile`, used to build
 * stable chunk ids and to tag each chunk with its source file.
 * @param onProgress - Called as pages finish, so the UI can show what's
 * being processed (and whether OCR, which is much slower than reading a
 * text layer, is in use).
 * @param ocrLanguage - Which language(s) to OCR scanned pages in. `'auto'`
 * detects it from the document's first scanned page.
 * @returns One chunk per non-empty page, in page order.
 * @throws A `TranslatableError` if the PDF is password-protected,
 * corrupted, or otherwise unreadable.
 */
async function extractPdfChunks(
  file: File,
  fileId: string,
  onProgress?: (progress: ParseProgress) => void,
  ocrLanguage: OcrLanguagePreference = 'auto',
): Promise<DocumentChunk[]> {
  const { getDocument, GlobalWorkerOptions, InvalidPDFException } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  const arrayBuffer = await file.arrayBuffer()
  const assetBase = import.meta.env.BASE_URL

  let pdf
  try {
    pdf = await getDocument({
      data: arrayBuffer,
      cMapUrl: `${assetBase}pdfjs/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${assetBase}pdfjs/standard_fonts/`,
    }).promise
  } catch (error) {
    if (error instanceof InvalidPDFException) {
      throw new TranslatableError('errors.pdfCorrupted')
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'PasswordException') {
      throw new TranslatableError('errors.pdfPasswordProtected')
    }
    throw new TranslatableError('errors.pdfUnreadable')
  }

  const totalPages = pdf.numPages
  const pageTexts = new Map<number, string>()
  const scannedPages: number[] = []
  let poolPromise: Promise<OcrPool | null> | null = null

  try {
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      page.cleanup()

      const text = joinTextItems(textContent.items)
      if (text) {
        pageTexts.set(pageNumber, text)
      } else {
        scannedPages.push(pageNumber)
        if (!poolPromise) {
          // Started, not awaited: loading the OCR engine takes seconds, and
          // there are still text layers to read in the meantime.
          poolPromise = import('../lib/ocr')
            .then(({ createOcrPool }) => createOcrPool(ocrLanguage, OCR_TARGET_DPI))
            .catch(() => null)
        }
      }

      onProgress?.({ page: pageNumber, totalPages, phase: 'reading' })
    }

    if (poolPromise) {
      const pool = await poolPromise
      if (pool) {
        let recognized = 0
        onProgress?.({ page: 0, totalPages: scannedPages.length, phase: 'ocr' })
        try {
          await recognizePages(pdf, scannedPages, pool, pageTexts, () => {
            recognized += 1
            onProgress?.({ page: recognized, totalPages: scannedPages.length, phase: 'ocr' })
          })
        } finally {
          await pool.terminate()
        }
      }
    }
  } finally {
    await pdf.destroy()
  }

  const chunks: DocumentChunk[] = []
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const text = pageTexts.get(pageNumber)
    if (!text) continue
    chunks.push({
      id: `${fileId}-p${pageNumber}`,
      fileId,
      fileName: file.name,
      locationType: 'page',
      location: pageNumber,
      text,
    })
  }
  return chunks
}

/**
 * Provides a function to parse an uploaded PDF file into per-page text
 * chunks for indexing and search. Reading text layers happens on the main
 * thread but yields between pages, and OCR of scanned pages runs in
 * background workers, so the UI stays responsive throughout.
 */
export function usePdfParser() {
  const parsePdf = useCallback(
    (
      file: File,
      fileId: string,
      onProgress?: (progress: ParseProgress) => void,
      ocrLanguage?: OcrLanguagePreference,
    ) => extractPdfChunks(file, fileId, onProgress, ocrLanguage),
    [],
  )
  return { parsePdf }
}
