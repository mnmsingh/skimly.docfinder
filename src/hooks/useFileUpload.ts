import { useCallback, useState } from 'react'
import type { UploadedFile } from '../types/uploadedFile'
import type { TranslationKey } from '../i18n/translations'

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx']
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex === -1 ? '' : fileName.slice(dotIndex).toLowerCase()
}

function validateFile(file: File): { key: TranslationKey; params?: Record<string, string | number> } | undefined {
  const extension = getExtension(file.name)
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return { key: 'errors.unsupportedFileType', params: { extension: extension || '?' } }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { key: 'errors.fileTooLarge', params: { sizeMB: (file.size / (1024 * 1024)).toFixed(1) } }
  }
  return undefined
}

/**
 * Manages the set of files a user has selected for upload.
 *
 * Each file is validated as soon as it's added (accepted type is PDF/DOCX by
 * extension, and a 100 MB size cap) and tagged with a 'ready' or 'error'
 * status — this hook does not parse or read file contents, it only tracks
 * selection and validation state.
 *
 * @returns `files` — the current list of uploaded files with their
 * validation status; `addFiles` — adds one or more newly selected files (from
 * a file picker or a drag-and-drop event); `removeFile` — removes a file by
 * its id; `clearFiles` — removes all selected files.
 */
export function useFileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((file) => {
      const error = validateFile(file)
      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        status: error ? 'error' : 'ready',
        errorKey: error?.key,
        errorParams: error?.params,
      }
    })
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  return { files, addFiles, removeFile, clearFiles }
}
