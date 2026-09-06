import { LANGUAGES, type Language } from '../i18n/translations'
import { OCR_LANGUAGE_PREFERENCES, type OcrLanguagePreference } from '../types/ocrLanguage'
import type { TFunction } from '../hooks/useLanguage'

interface OcrLanguageSelectProps {
  /** The currently selected document-language preference. */
  value: OcrLanguagePreference
  /** Called with the newly chosen preference. */
  onChange: (preference: OcrLanguagePreference) => void
  t: TFunction
}

/**
 * Maps the Tesseract language codes used for documents onto the UI language
 * codes, so each option can reuse the same own-script label the UI language
 * switcher already shows.
 */
const UI_LANGUAGE_CODE: Partial<Record<OcrLanguagePreference, Language>> = {
  eng: 'en',
  hin: 'hi',
  mar: 'mr',
}

function optionLabel(preference: OcrLanguagePreference, t: TFunction): string {
  const uiCode = UI_LANGUAGE_CODE[preference]
  if (uiCode) {
    return LANGUAGES.find(({ code }) => code === uiCode)?.nativeLabel ?? uiCode
  }
  return preference === 'auto' ? t('ocrLanguage.auto') : t('ocrLanguage.mixed')
}

/**
 * Dropdown letting the user say what language their scanned documents are
 * written in.
 *
 * This only affects PDFs with no text layer, which have to be read by OCR.
 * Recognizing one language is roughly three times faster than recognizing
 * all three, so the default ('Detect automatically') works that out from the
 * document's first scanned page — this control is the override for when that
 * guess is wrong, or when the answer is already known.
 */
export function OcrLanguageSelect({ value, onChange, t }: OcrLanguageSelectProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <label htmlFor="ocr-language" className="text-xs font-medium text-slate-700 dark:text-slate-200">
        {t('ocrLanguage.label')}
      </label>
      <select
        id="ocr-language"
        value={value}
        onChange={(event) => onChange(event.target.value as OcrLanguagePreference)}
        className="rounded-md border border-border bg-surface py-1.5 pl-2.5 pr-7 text-xs font-medium
          text-slate-700 transition-colors duration-150 hover:bg-slate-50
          dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {OCR_LANGUAGE_PREFERENCES.map((preference) => (
          <option key={preference} value={preference}>
            {optionLabel(preference, t)}
          </option>
        ))}
      </select>
      <p className="w-full text-xs text-muted sm:w-auto sm:flex-1">{t('ocrLanguage.help')}</p>
    </div>
  )
}
