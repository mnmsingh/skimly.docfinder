/** What `location` counts — a PDF page or a DOCX paragraph. Used to pick the right translated label at render time. */
export type LocationType = 'page' | 'paragraph'

/**
 * A single searchable unit of text extracted from an uploaded document —
 * one page for a PDF, or one paragraph for a Word (.docx) file (which has
 * no native page concept).
 */
export interface DocumentChunk {
  /** Unique id across all documents, used as the search index key. */
  id: string
  /** Id of the `UploadedFile` this chunk came from. */
  fileId: string
  /** Name of the source file, shown alongside search results. */
  fileName: string
  /** Whether `location` counts pages ('page', for PDFs) or paragraphs ('paragraph', for DOCX). */
  locationType: LocationType
  /** 1-based page number (PDF) or paragraph number (DOCX). */
  location: number
  /** Extracted plain text for this chunk. */
  text: string
}
