import { useCallback, useMemo } from 'react'
import MiniSearch from 'minisearch'
import type { DocumentChunk, LocationType } from '../types/documentChunk'
import type { SearchResult } from '../types/searchResult'

/**
 * Builds a full-text search index (MiniSearch) over a flat list of parsed
 * document chunks (PDF pages / DOCX paragraphs) and exposes a `search`
 * function that returns ranked matches with everything needed to display
 * them — file name, page/paragraph number, and the matched text. Documents
 * can be in English, Hindi, or Marathi (or mixed): MiniSearch's default
 * tokenizer splits on Unicode whitespace/punctuation rather than an
 * English-specific word pattern, so Devanagari text indexes and matches
 * the same way English does, with no special-casing needed here.
 *
 * @param chunks - All chunks currently available to search, across every
 * successfully parsed document. The index is rebuilt whenever this changes.
 * @returns `search` — looks up a query string and returns ranked
 * `SearchResult`s (empty for a blank query).
 */
export function useSearchIndex(chunks: DocumentChunk[]) {
  const index = useMemo(() => {
    const miniSearch = new MiniSearch<DocumentChunk>({
      idField: 'id',
      fields: ['text'],
      storeFields: ['fileId', 'fileName', 'locationType', 'location', 'text'],
    })
    miniSearch.addAll(chunks)
    return miniSearch
  }, [chunks])

  const search = useCallback(
    (query: string): SearchResult[] => {
      if (!query.trim()) return []
      return index.search(query, { prefix: true, fuzzy: 0.2, combineWith: 'AND' }).map((result) => ({
        id: String(result.id),
        fileId: result.fileId as string,
        fileName: result.fileName as string,
        locationType: result.locationType as LocationType,
        location: result.location as number,
        text: result.text as string,
        score: result.score,
        matchedTerms: result.terms,
      }))
    },
    [index],
  )

  return { search }
}
