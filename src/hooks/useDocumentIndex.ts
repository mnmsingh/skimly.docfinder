import { useEffect, useRef, useState } from 'react'
import { usePdfParser } from './usePdfParser'
import { useDocxParser } from './useDocxParser'
import type { UploadedFile } from '../types/uploadedFile'
import type { ProcessedDocument } from '../types/processedDocument'
import type { ParseProgress } from '../types/parseProgress'
import type { OcrLanguagePreference } from '../types/ocrLanguage'
import { TranslatableError } from '../i18n/translatableError'

function getExtension(fileName: string): string {
  return fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
}

/**
 * Watches the list of uploaded files and parses each validated one (PDF via
 * pdf.js, DOCX via mammoth.js) into searchable text chunks, tracking each
 * file's progress as 'parsing', 'done', or 'error'.
 *
 * A file's parsed chunks are dropped automatically once it's removed from
 * `files`, so memory doesn't grow unbounded across a long session.
 *
 * @param files - The current set of uploaded files from `useFileUpload`.
 * Only files with validation status 'ready' are parsed.
 * @param ocrLanguage - Which language(s) to recognize scanned PDF pages in.
 * Read at the moment each file starts parsing, so changing it affects files
 * added from then on, not ones already being processed.
 * @returns `documents` — a map from file id to its processing status and
 * (once status is 'done') its extracted chunks.
 */
export function useDocumentIndex(files: UploadedFile[], ocrLanguage: OcrLanguagePreference) {
  const [documents, setDocuments] = useState<Record<string, ProcessedDocument>>({})
  const startedIdsRef = useRef(new Set<string>())
  const { parsePdf } = usePdfParser()
  const { parseDocx } = useDocxParser()

  // Held in a ref rather than listed as a dependency: this effect is keyed on
  // `files`, and re-running it when only the language preference changes would
  // do nothing except churn (already-started files are skipped anyway).
  const ocrLanguageRef = useRef(ocrLanguage)
  ocrLanguageRef.current = ocrLanguage

  useEffect(() => {
    const currentIds = new Set(files.map((f) => f.id))

    for (const id of Array.from(startedIdsRef.current)) {
      if (!currentIds.has(id)) startedIdsRef.current.delete(id)
    }

    setDocuments((prev) => {
      let changed = false
      const next: Record<string, ProcessedDocument> = {}
      for (const [id, doc] of Object.entries(prev)) {
        if (currentIds.has(id)) {
          next[id] = doc
        } else {
          changed = true
        }
      }
      return changed ? next : prev
    })

    const toProcess = files.filter((f) => f.status === 'ready' && !startedIdsRef.current.has(f.id))

    for (const uploadedFile of toProcess) {
      startedIdsRef.current.add(uploadedFile.id)
      const { id: fileId, file } = uploadedFile

      setDocuments((prev) => ({
        ...prev,
        [fileId]: { fileId, fileName: file.name, status: 'parsing', chunks: [] },
      }))

      const onProgress = (progress: ParseProgress) => {
        setDocuments((prev) => (prev[fileId] ? { ...prev, [fileId]: { ...prev[fileId], progress } } : prev))
      }

      const parsePromise =
        getExtension(file.name) === '.pdf'
          ? parsePdf(file, fileId, onProgress, ocrLanguageRef.current)
          : parseDocx(file, fileId)

      parsePromise
        .then((chunks) => {
          setDocuments((prev) =>
            prev[fileId] ? { ...prev, [fileId]: { ...prev[fileId], status: 'done', chunks } } : prev,
          )
        })
        .catch((error: unknown) => {
          const { key, params } =
            error instanceof TranslatableError
              ? { key: error.key, params: error.params }
              : { key: 'errors.fileUnreadable' as const, params: undefined }
          setDocuments((prev) =>
            prev[fileId]
              ? { ...prev, [fileId]: { ...prev[fileId], status: 'error', errorKey: key, errorParams: params } }
              : prev,
          )
        })
    }
  }, [files, parsePdf, parseDocx])

  return { documents }
}
