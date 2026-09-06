import type { DocumentChunk } from './documentChunk'
import type { TranslationKey } from '../i18n/translations'
import type { ParseProgress } from './parseProgress'

/** Progress of parsing/indexing one uploaded file into searchable chunks. */
export type ProcessingStatus = 'parsing' | 'done' | 'error'

/** Tracks one uploaded file's parsing progress and, once done, its chunks. */
export interface ProcessedDocument {
  /** Id of the corresponding `UploadedFile`. */
  fileId: string
  /** Name of the source file. */
  fileName: string
  /** 'parsing' while text extraction is in progress, 'done' once chunks are ready, 'error' if it failed. */
  status: ProcessingStatus
  /** Which page is currently being processed. Only set while status is 'parsing', and only for PDFs. */
  progress?: ParseProgress
  /** Translation key for why parsing failed. Only set when status is 'error'. */
  errorKey?: TranslationKey
  /** Values to fill into `errorKey`'s `{{param}}` placeholders. */
  errorParams?: Record<string, string | number>
  /** Extracted text chunks (pages or paragraphs). Empty until status is 'done'. */
  chunks: DocumentChunk[]
}
