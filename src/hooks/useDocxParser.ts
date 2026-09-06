import { useCallback } from 'react'
import type { DocumentChunk } from '../types/documentChunk'
import { TranslatableError } from '../i18n/translatableError'

/**
 * Extracts paragraph-level text from a Word (.docx) file using mammoth.js,
 * entirely in the browser. Word files have no native page concept, so each
 * non-empty paragraph becomes one `DocumentChunk` with an approximate
 * "Paragraph N" location instead of a page number.
 *
 * mammoth.js is imported dynamically here rather than at module scope, so
 * its code is only downloaded once a user actually uploads a .docx file,
 * keeping the initial page load lightweight.
 *
 * @param file - The DOCX file to parse.
 * @param fileId - Id of the corresponding `UploadedFile`, used to build
 * stable chunk ids and to tag each chunk with its source file.
 * @returns One chunk per non-empty paragraph, in document order.
 * @throws A `TranslatableError` if the file is corrupted or not a valid
 * .docx.
 */
async function extractDocxChunks(file: File, fileId: string): Promise<DocumentChunk[]> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()

  let rawText: string
  try {
    const result = await mammoth.extractRawText({ arrayBuffer })
    rawText = result.value
  } catch {
    throw new TranslatableError('errors.docxUnreadable')
  }

  const paragraphs = rawText
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)

  return paragraphs.map((text, index) => ({
    id: `${fileId}-para${index + 1}`,
    fileId,
    fileName: file.name,
    locationType: 'paragraph',
    location: index + 1,
    text,
  }))
}

/**
 * Provides a function to parse an uploaded Word (.docx) file into
 * paragraph-level text chunks for indexing and search.
 */
export function useDocxParser() {
  const parseDocx = useCallback((file: File, fileId: string) => extractDocxChunks(file, fileId), [])
  return { parseDocx }
}
