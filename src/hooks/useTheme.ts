import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'skimly-theme'

function getInitialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Reads and toggles the app's light/dark theme.
 *
 * The initial theme is decided synchronously before React mounts by an
 * inline script in `index.html` (which checks localStorage, then the OS
 * preference) so there's no flash of the wrong theme on load. This hook
 * just reads that starting state off the `<html>` element and keeps it,
 * `<html class="dark">`, and localStorage in sync from then on.
 *
 * @returns `theme` — the current theme; `toggleTheme` — flips it.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Storage can be unavailable (e.g. private browsing) — theme still
      // works for the current page load, it just won't persist.
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
