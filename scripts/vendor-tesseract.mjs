/**
 * Vendors the assets Tesseract.js needs at runtime into `public/tesseract/`,
 * so OCR never reaches out to a CDN.
 *
 * Two kinds of asset are copied:
 *
 * 1. **WebAssembly cores** from the installed `tesseract.js-core` package.
 *    Tesseract.js picks one at runtime based on which WebAssembly features
 *    the browser supports, so `corePath` must point at a *directory* holding
 *    all the variants rather than a single file. Only the `-lstm` cores are
 *    vendored: the workers run with the default LSTM-only OCR engine mode,
 *    so the legacy cores are never requested. Each `.wasm.js` file embeds
 *    its own WebAssembly binary, so the sibling `.wasm` files aren't needed.
 *
 * 2. **Trained language data** downloaded from the Tesseract.js data host.
 *    The `4.0.0_fast` variant is used rather than the `4.0.0_best_int` one
 *    Tesseract.js defaults to — the fast models are roughly a third smaller
 *    and recognise noticeably quicker, which matters because a scanned page
 *    is by far the slowest thing this app does.
 *
 * Run with `npm run vendor:tesseract`. Re-run after upgrading `tesseract.js`
 * or `tesseract.js-core`.
 */
import { mkdir, copyFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreOutDir = join(projectRoot, 'public', 'tesseract', 'core')
const langOutDir = join(projectRoot, 'public', 'tesseract', 'lang')

const CORE_FILES = [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
]

const LANG_BASE_URL = 'https://tessdata.projectnaptha.com/4.0.0_fast'
const LANGUAGES = ['eng', 'hin', 'mar']

async function vendorCores() {
  const coreSrcDir = join(projectRoot, 'node_modules', 'tesseract.js-core')
  await mkdir(coreOutDir, { recursive: true })

  for (const file of CORE_FILES) {
    const from = join(coreSrcDir, file)
    try {
      await access(from)
    } catch {
      throw new Error(`Missing ${from} — run \`npm install\` first.`)
    }
    await copyFile(from, join(coreOutDir, file))
    console.log(`core  ${file}`)
  }
}

async function vendorLanguages() {
  await mkdir(langOutDir, { recursive: true })

  for (const lang of LANGUAGES) {
    const name = `${lang}.traineddata.gz`
    const url = `${LANG_BASE_URL}/${name}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: HTTP ${response.status}`)
    }
    const data = new Uint8Array(await response.arrayBuffer())
    await writeFile(join(langOutDir, name), data)
    console.log(`lang  ${name} (${(data.byteLength / 1024).toFixed(0)} KB)`)
  }
}

await vendorCores()
await vendorLanguages()
console.log('\nVendored Tesseract assets into public/tesseract/')
