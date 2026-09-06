import tesseractWorkerUrl from 'tesseract.js/dist/worker.min.js?url'
import type * as Tesseract from 'tesseract.js'
import type { OcrLanguagePreference } from '../types/ocrLanguage'

/**
 * The languages this app can recognize, matching the languages its UI is
 * translated into (see `translations.ts`). Trained data for exactly these is
 * vendored into `public/tesseract/lang/`.
 */
const ALL_LANGUAGES = ['eng', 'hin', 'mar'] as const

/**
 * The language every Devanagari document is recognized alongside.
 *
 * Hindi and Marathi documents routinely carry Latin text — voter ID numbers,
 * place names, form codes — and a Devanagari-only model mangles it badly
 * (measured: "zebrafish checkpoint marker" came back as "76९0171150 (6८६७
 * प्रोबट्श"). Adding English back costs only a few percent, because most of
 * a page's recognition time goes on layout analysis rather than on running
 * each language's model.
 */
const LATIN_COMPANION = 'eng'

/**
 * Upper bound on concurrent OCR workers. Each one holds its own copy of the
 * WebAssembly engine and language model in memory, so past roughly four the
 * added throughput stops paying for the RAM.
 */
const MAX_POOL_SIZE = 4

/**
 * Tesseract's mean confidence (0-100) below which a language guess is not
 * trusted. A genuinely low score usually means the page is a poor scan or
 * mixes scripts, rather than that some other language would score better.
 */
const MIN_DETECTION_CONFIDENCE = 40

/**
 * Minimum number of non-whitespace characters a detection page must yield
 * for its confidence score to mean anything. A near-empty page (a cover
 * sheet, a full-page photo) can score high on almost any language.
 */
const MIN_DETECTION_CHARS = 24

/**
 * A fixed-size set of Tesseract.js workers that recognize scanned pages in
 * parallel, hiding both the pool and the language choice from callers.
 */
export interface OcrPool {
  /**
   * Recognizes the text in one rendered page image.
   *
   * Calls are queued across the pool's workers, so several pages can be
   * submitted at once and will be recognized concurrently. For a pool
   * created with `'auto'`, the very first call also performs language
   * detection and therefore takes noticeably longer than the rest.
   *
   * @param image - A rendered page, as an image blob (PNG or JPEG).
   * @returns The recognized text, whitespace-collapsed. Empty if the page
   * yielded nothing readable.
   */
  recognize(image: Blob): Promise<string>
  /** Shuts down every worker. Safe to call more than once. */
  terminate(): Promise<void>
}

/** A single-language worker used only to decide which language a document is in. */
interface LanguageProbe {
  lang: string
  worker: Tesseract.Worker
}

/** What one probe made of the detection page. */
interface ProbeScore {
  probe: LanguageProbe
  /** Tesseract's mean confidence across the page, 0-100, or -1 if it failed. */
  confidence: number
  text: string
}

/**
 * Where Tesseract.js should fetch its WebAssembly engine, language data, and
 * worker script from.
 *
 * All three default to a public CDN. They're pointed at same-origin copies
 * instead (vendored by `npm run vendor:tesseract`) so that OCR makes no
 * third-party requests at all — the app promises that nothing leaves the
 * user's device, and a CDN request for `mar.traineddata` would leak what
 * kind of document is being read.
 */
function workerOptions(): Partial<Tesseract.WorkerOptions> {
  const assetBase = import.meta.env.BASE_URL
  return {
    corePath: `${assetBase}tesseract/core`,
    langPath: `${assetBase}tesseract/lang`,
    workerPath: tesseractWorkerUrl,
  }
}

/**
 * Expands one chosen language into the set a worker should actually load:
 * a Devanagari language is always paired with English (see
 * `LATIN_COMPANION`), while English stands alone.
 */
function languagesFor(lang: string): string[] {
  return lang === LATIN_COMPANION ? [lang] : [lang, LATIN_COMPANION]
}

/** Collapses Tesseract's line-broken output into the single-line form chunks store. */
function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * How many workers to run at once, leaving a core free for the main thread
 * (which still has to render each page with pdf.js before it can be OCR'd).
 */
function poolSize(): number {
  const cores = navigator.hardwareConcurrency ?? 4
  return Math.min(MAX_POOL_SIZE, Math.max(1, cores - 1))
}

/**
 * Creates `count` workers all loaded with the same language(s).
 *
 * The first worker is awaited before the rest are started: every worker
 * fetches the same multi-megabyte engine and language data, so letting them
 * all start at once means racing to download identical bytes several times
 * over. Once the first has finished, the engine is in the HTTP cache and the
 * language data in IndexedDB, and the rest come up quickly.
 *
 * @param langs - Language codes to load into each worker.
 * @param count - How many workers to create. Zero returns an empty array.
 * @param dpi - Resolution the pages were rendered at, passed to Tesseract so
 * it doesn't have to estimate it.
 */
async function createWorkers(langs: string[], count: number, dpi: number): Promise<Tesseract.Worker[]> {
  if (count <= 0) return []

  const { createWorker } = await import('tesseract.js')
  const spawn = async (workerLangs: string[]) => {
    const worker = await createWorker(workerLangs, undefined, workerOptions())
    await worker.setParameters({ user_defined_dpi: String(dpi) })
    return worker
  }

  const first = await spawn(langs)
  if (count === 1) return [first]
  const rest = await Promise.all(Array.from({ length: count - 1 }, () => spawn(langs)))
  return [first, ...rest]
}

/** Creates one worker per supported language, for the detection pass. */
async function createProbes(dpi: number): Promise<LanguageProbe[]> {
  const [firstLang, ...otherLangs] = ALL_LANGUAGES
  const [first] = await createWorkers([firstLang], 1, dpi)
  const others = await Promise.all(
    otherLangs.map(async (lang) => ({ lang, worker: (await createWorkers([lang], 1, dpi))[0] })),
  )
  return [{ lang: firstLang, worker: first }, ...others]
}

/** Runs one probe over the detection page, scoring how well its language fits. */
async function scoreProbe(probe: LanguageProbe, image: Blob): Promise<ProbeScore> {
  try {
    const { data } = await probe.worker.recognize(image)
    return { probe, confidence: data.confidence, text: normalizeText(data.text) }
  } catch {
    return { probe, confidence: -1, text: '' }
  }
}

/**
 * Starts a pool of OCR workers for one document.
 *
 * Creating workers is slow — several megabytes of WebAssembly engine and
 * language data have to load before the first page can be recognized — so
 * this is deliberately callable early: start it as soon as a document is
 * known to need OCR at all, and await the result only once there's a page
 * ready to recognize.
 *
 * With an explicit language (or `'mixed'`), the full pool is built up front.
 * With `'auto'`, one worker per language is started instead, and the first
 * call to `recognize` doubles as the detection pass: that page is recognized
 * in all three languages at once, the highest-confidence one wins the rest
 * of the document (paired with English — see `LATIN_COMPANION`), and the
 * pool is rebuilt around it. If nothing scores confidently, all three
 * languages are kept — slower, but never wrong.
 *
 * @param preference - Which language(s) to recognize in, or `'auto'`.
 * @param dpi - Resolution pages will be rendered at, so Tesseract can skip
 * estimating it.
 * @returns A pool ready to accept pages.
 * @throws If Tesseract.js can't be loaded or its vendored assets are
 * missing; callers should treat this as "this document can't be OCR'd"
 * rather than as a fatal error.
 */
export async function createOcrPool(preference: OcrLanguagePreference, dpi: number): Promise<OcrPool> {
  const { createScheduler } = await import('tesseract.js')
  const scheduler = createScheduler()
  const size = poolSize()
  const allWorkers: Tesseract.Worker[] = []

  const track = (workers: Tesseract.Worker[]) => {
    for (const worker of workers) {
      allWorkers.push(worker)
      scheduler.addWorker(worker)
    }
    return workers
  }

  const terminate = async () => {
    await Promise.all(allWorkers.map((worker) => worker.terminate().catch(() => undefined)))
    allWorkers.length = 0
  }

  const recognizeViaPool = async (image: Blob) => {
    const { data } = await scheduler.addJob('recognize', image)
    return normalizeText(data.text)
  }

  if (preference !== 'auto') {
    const langs = preference === 'mixed' ? [...ALL_LANGUAGES] : languagesFor(preference)
    track(await createWorkers(langs, size, dpi))
    return { recognize: recognizeViaPool, terminate }
  }

  const probes = await createProbes(dpi)
  for (const probe of probes) allWorkers.push(probe.worker)

  /**
   * Resolves once the pool is built. Its value is the detection page's text
   * when a single language won (so that page isn't recognized twice), or
   * null when the all-languages fallback was taken and the page still needs
   * a normal pass.
   */
  let setup: Promise<string | null> | null = null

  const runSetup = async (image: Blob): Promise<string | null> => {
    const scores = await Promise.all(probes.map((probe) => scoreProbe(probe, image)))
    const best = scores.reduce((a, b) => (b.confidence > a.confidence ? b : a))
    const readableChars = best.text.replace(/\s/g, '').length

    if (best.confidence >= MIN_DETECTION_CONFIDENCE && readableChars >= MIN_DETECTION_CHARS) {
      const chosen = languagesFor(best.probe.lang)

      const losers = probes.filter((probe) => probe !== best.probe)
      await Promise.all(
        losers.map(async (probe) => {
          await probe.worker.terminate().catch(() => undefined)
          allWorkers.splice(allWorkers.indexOf(probe.worker), 1)
        }),
      )

      if (chosen.length > 1) {
        await best.probe.worker.reinitialize(chosen.join('+'))
      }
      scheduler.addWorker(best.probe.worker)
      track(await createWorkers(chosen, size - 1, dpi))

      // The detection text is only reusable when the winning probe's
      // languages didn't change. Once English is added the page has to be
      // read again, or its Latin text would keep the mangled reading.
      return chosen.length > 1 ? null : best.text
    }

    // Nothing scored confidently — the page may mix scripts or just be a
    // poor scan. Recognizing all three languages is roughly three times
    // slower, but it can't pick the wrong one.
    const keep = probes.slice(0, size)
    await Promise.all(
      probes.slice(size).map(async (probe) => {
        await probe.worker.terminate().catch(() => undefined)
        allWorkers.splice(allWorkers.indexOf(probe.worker), 1)
      }),
    )
    // `reinitialize` only takes an array of pre-fetched language data, so the
    // codes go in as Tesseract's own '+'-joined form instead.
    await Promise.all(keep.map((probe) => probe.worker.reinitialize(ALL_LANGUAGES.join('+'))))
    for (const probe of keep) scheduler.addWorker(probe.worker)
    return null
  }

  const recognize = async (image: Blob): Promise<string> => {
    if (!setup) {
      // Assigned before any await, so concurrent callers can't both start it.
      setup = runSetup(image)
      const detectedText = await setup
      if (detectedText !== null) return detectedText
    } else {
      await setup
    }
    return recognizeViaPool(image)
  }

  return { recognize, terminate }
}
