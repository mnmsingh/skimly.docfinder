import type { SearchResult } from '../types/searchResult'
import { buildHighlightedSnippet } from '../lib/snippet'
import type { TFunction } from '../hooks/useLanguage'

interface SearchResultsProps {
  /** The (debounced) query currently applied. Empty means no search yet. */
  query: string
  /** Ranked matches for `query`, already scored and ready to render. */
  results: SearchResult[]
  /** Whether at least one document has finished indexing. */
  hasSearchableDocuments: boolean
  t: TFunction
}

/**
 * Renders search results, or the appropriate empty state: a prompt before
 * any query is typed, or a "no matches" message when a query has no hits.
 */
export function SearchResults({ query, results, hasSearchableDocuments, t }: SearchResultsProps) {
  if (!hasSearchableDocuments) {
    return <p className="mt-4 text-sm text-muted">{t('search.uploadPrompt')}</p>
  }

  if (!query.trim()) {
    return <p className="mt-4 text-sm text-muted">{t('search.typeToSearch')}</p>
  }

  if (results.length === 0) {
    return <p className="mt-4 text-sm text-muted">{t('search.noMatches', { query })}</p>
  }

  return (
    <ul className="mt-4 space-y-2">
      {results.map((result) => {
        const snippet = buildHighlightedSnippet(result.text, result.matchedTerms)
        const locationLabel = t(result.locationType === 'page' ? 'location.page' : 'location.paragraph', {
          number: result.location,
        })
        return (
          <li key={result.id} className="card px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{result.fileName}</p>
              <span className="badge shrink-0 bg-muted/10 text-muted">{locationLabel}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {snippet ? (
                <>
                  {snippet.before}
                  <mark className="rounded-sm bg-warning/30 px-0.5 text-slate-900 dark:text-slate-100">
                    {snippet.match}
                  </mark>
                  {snippet.after}
                </>
              ) : (
                result.text.slice(0, 160)
              )}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
