import type { LocationType } from './documentChunk'

/** One ranked match returned by the search index, ready to render. */
export interface SearchResult {
  /** Id of the matched `DocumentChunk`. */
  id: string
  /** Id of the source file, for grouping/keying. */
  fileId: string
  /** Name of the source file. */
  fileName: string
  /** Whether `location` is a page (PDF) or paragraph (DOCX) number — pick the translated label with this. */
  locationType: LocationType
  /** 1-based page or paragraph number within the file. */
  location: number
  /** Full text of the matched chunk, used to build a highlighted snippet. */
  text: string
  /** Relevance score assigned by the search index (higher is more relevant). */
  score: number
  /** Lowercased query terms that were found in this chunk, for highlighting. */
  matchedTerms: string[]
}
