import { useCallback, useEffect, useState } from 'react'
import { translations, type Language, type TranslationKey } from '../i18n/translations'

const STORAGE_KEY = 'skimly-language'
const DEFAULT_LANGUAGE: Language = 'en'

function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'hi' || value === 'mr'
}

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // Storage can be unavailable (e.g. private browsing) — fall through to the default.
  }
  return DEFAULT_LANGUAGE
}

/**
 * Manages the UI display language (English/Hindi/Marathi — separate from
 * the language of any uploaded document, which can be any of the three
 * regardless of the UI language chosen here) and provides `t()` to look up
 * translated strings.
 *
 * @returns `language` — the current UI language; `setLanguage` — switches
 * it (persisted to localStorage); `t` — translates a key, optionally
 * filling in `{{param}}` placeholders from the given values.
 */
export function useLanguage() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // Ignore storage errors — language still works for this session.
    }
  }, [language])

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const template: string = translations[language][key] ?? translations[DEFAULT_LANGUAGE][key]
      if (!params) return template
      return Object.entries(params).reduce(
        (result, [paramKey, value]) => result.replaceAll(`{{${paramKey}}}`, String(value)),
        template,
      )
    },
    [language],
  )

  return { language, setLanguage, t }
}

/** Type of the `t()` translation function returned by `useLanguage`, for typing component props. */
export type TFunction = ReturnType<typeof useLanguage>['t']
