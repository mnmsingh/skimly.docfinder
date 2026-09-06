import { useCallback, useEffect, useState } from 'react'
import { OCR_LANGUAGE_PREFERENCES, type OcrLanguagePreference } from '../types/ocrLanguage'

const STORAGE_KEY = 'skimly-ocr-language'

function isPreference(value: string | null): value is OcrLanguagePreference {
  return value !== null && (OCR_LANGUAGE_PREFERENCES as readonly string[]).includes(value)
}

function getInitialPreference(): OcrLanguagePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isPreference(stored)) return stored
  } catch {
    // Storage can be unavailable (e.g. private browsing) — fall through to
    // the default; the choice just won't persist across page loads.
  }
  return 'auto'
}

/**
 * Remembers which language the user wants scanned (image-only) PDF pages
 * recognized in.
 *
 * This is separate from the UI language (`useLanguage`): it describes the
 * *documents* being uploaded, not the interface, and it only has any effect
 * on PDFs that have no text layer and therefore need OCR. The default,
 * `'auto'`, lets the parser detect the language from the document itself.
 *
 * @returns `ocrLanguage` — the current preference; `setOcrLanguage` — changes
 * it, taking effect for files uploaded from then on.
 */
export function useOcrLanguage() {
  const [ocrLanguage, setOcrLanguageState] = useState<OcrLanguagePreference>(getInitialPreference)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, ocrLanguage)
    } catch {
      // See getInitialPreference — persistence is best-effort.
    }
  }, [ocrLanguage])

  const setOcrLanguage = useCallback((preference: OcrLanguagePreference) => {
    setOcrLanguageState(preference)
  }, [])

  return { ocrLanguage, setOcrLanguage }
}
