/** A chunk of text split around one matched term, ready to render with a highlight. */
export interface HighlightedSnippet {
  before: string
  match: string
  after: string
}

const CONTEXT_CHARS = 70

/**
 * Finds the first occurrence of any matched search term within a chunk's
 * text and returns the surrounding text split into three parts, so the
 * match can be rendered with a highlight (e.g. wrapped in `<mark>`).
 *
 * @param text - Full text of the chunk (a PDF page or DOCX paragraph).
 * @param matchedTerms - Terms the search index reports as matched for this
 * result (case-insensitive).
 * @returns The snippet split around the first match, with an ellipsis added
 * where text was cut off, or `null` if none of the matched terms could be
 * located in the text.
 */
export function buildHighlightedSnippet(text: string, matchedTerms: string[]): HighlightedSnippet | null {
  const lowerText = text.toLowerCase()
  let matchIndex = -1
  let matchLength = 0

  for (const term of matchedTerms) {
    const index = lowerText.indexOf(term.toLowerCase())
    if (index !== -1 && (matchIndex === -1 || index < matchIndex)) {
      matchIndex = index
      matchLength = term.length
    }
  }

  if (matchIndex === -1) return null

  const start = Math.max(0, matchIndex - CONTEXT_CHARS)
  const end = Math.min(text.length, matchIndex + matchLength + CONTEXT_CHARS)

  return {
    before: (start > 0 ? '…' : '') + text.slice(start, matchIndex),
    match: text.slice(matchIndex, matchIndex + matchLength),
    after: text.slice(matchIndex + matchLength, end) + (end < text.length ? '…' : ''),
  }
}
