import { LANGUAGES, type Language } from '../i18n/translations'
import type { TFunction } from '../hooks/useLanguage'

interface LanguageSwitcherProps {
  /** The currently active UI language. */
  language: Language
  /** Called with the newly chosen language code. */
  onChange: (language: Language) => void
  t: TFunction
}

/**
 * Dropdown for switching the UI's display language (English/Hindi/Marathi).
 * This only affects interface text — an uploaded document can be in any of
 * the three regardless of which UI language is selected.
 */
export function LanguageSwitcher({ language, onChange, t }: LanguageSwitcherProps) {
  return (
    <select
      value={language}
      onChange={(event) => onChange(event.target.value as Language)}
      aria-label={t('language.ariaLabel')}
      className="shrink-0 rounded-md border border-border bg-surface py-1.5 pl-2.5 pr-7 text-xs font-medium
        text-slate-700 transition-colors duration-150 hover:bg-slate-50
        dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {LANGUAGES.map(({ code, nativeLabel }) => (
        <option key={code} value={code}>
          {nativeLabel}
        </option>
      ))}
    </select>
  )
}
