import { useRef } from 'react'
import type { TFunction } from '../hooks/useLanguage'

interface SearchBarProps {
  /** Current search input value (controlled). */
  value: string
  /** Called with the new value on every keystroke. */
  onChange: (value: string) => void
  t: TFunction
}

/**
 * Search input for querying across all uploaded, indexed documents.
 * Search runs live as the user types (debounced in the parent), but the
 * field is still a real `<form>` with a visible search button so pressing
 * Enter or clicking it "submits" in the way users expect — it just blurs
 * the field (closing the mobile keyboard) rather than triggering a second
 * search, since one is already running.
 *
 * Always editable — even before any document has finished indexing — so
 * typing never feels broken; `SearchResults` explains when there's
 * nothing to search yet.
 */
export function SearchBar({ value, onChange, t }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        inputRef.current?.blur()
      }}
      className="relative"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="m20 20-3.6-3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('search.placeholder')}
        aria-label={t('search.ariaLabel')}
        className="w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-12 text-sm text-slate-900
          placeholder:text-muted transition-colors duration-150
          focus:border-primary dark:text-slate-100"
      />
      <button
        type="submit"
        aria-label={t('search.buttonAriaLabel')}
        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center
          rounded-md bg-primary text-white transition-colors duration-150 hover:bg-primary-hover"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-3.6-3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  )
}
