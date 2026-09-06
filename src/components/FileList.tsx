import type { UploadedFile } from '../types/uploadedFile'
import type { ProcessedDocument } from '../types/processedDocument'
import type { TFunction } from '../hooks/useLanguage'

interface FileListProps {
  /** Files to display, each already validated (status/errorKey set by the caller). */
  files: UploadedFile[]
  /** Parsing/indexing progress for each file, keyed by file id. */
  documents: Record<string, ProcessedDocument>
  /** Called with a file's id when the user clicks its remove button. */
  onRemove: (id: string) => void
  t: TFunction
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileKind(fileName: string): 'PDF' | 'DOCX' | 'FILE' {
  const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toUpperCase()
  return extension === 'PDF' || extension === 'DOCX' ? extension : 'FILE'
}

/** Small colored badge identifying a file's type (PDF/DOCX). */
function FileKindBadge({ fileName }: { fileName: string }) {
  const kind = getFileKind(fileName)
  const styles =
    kind === 'PDF'
      ? 'bg-error/10 text-error'
      : kind === 'DOCX'
        ? 'bg-primary/10 text-primary'
        : 'bg-muted/10 text-muted'

  return (
    <span
      className={`badge ${styles} h-9 w-9 shrink-0 justify-center rounded-md text-[11px] font-semibold tracking-tight`}
      aria-hidden="true"
    >
      {kind === 'FILE' ? '?' : kind}
    </span>
  )
}

/** Small spinner shown while a file is being parsed/indexed. */
function Spinner() {
  return (
    <svg className="h-3 w-3 shrink-0 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** Status line under a file's name: validation error, parsing progress, parse error, or ready. */
function FileStatusLine({ file, doc, t }: { file: UploadedFile; doc?: ProcessedDocument; t: TFunction }) {
  if (file.status === 'error' && file.errorKey) {
    return <p className="mt-0.5 text-xs text-error">{t(file.errorKey, file.errorParams)}</p>
  }

  if (!doc || doc.status === 'parsing') {
    const progress = doc?.progress
    const label = !progress
      ? t('fileList.reading')
      : progress.phase === 'ocr'
        ? t('fileList.ocrPage', { page: progress.page, total: progress.totalPages })
        : t('fileList.readingPage', { page: progress.page, total: progress.totalPages })

    return (
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
        <Spinner />
        {label}
      </p>
    )
  }

  if (doc.status === 'error' && doc.errorKey) {
    return <p className="mt-0.5 text-xs text-error">{t(doc.errorKey, doc.errorParams)}</p>
  }

  return <p className="mt-0.5 text-xs text-success">{t('fileList.readyToSearch', { size: formatFileSize(file.file.size) })}</p>
}

/**
 * Renders the list of files a user has selected for upload, showing each
 * file's name and size, its validation error, or its parsing/indexing
 * progress once selection succeeds.
 *
 * @param files - Files to display.
 * @param documents - Parsing/indexing progress for each file, keyed by id.
 * @param onRemove - Called with a file's id when its remove button is clicked.
 */
export function FileList({ files, documents, onRemove, t }: FileListProps) {
  if (files.length === 0) {
    return null
  }

  return (
    <ul className="mt-4 space-y-2">
      {files.map((uploadedFile) => {
        const { id, file, status } = uploadedFile
        const doc = documents[id]
        const hasError = status === 'error' || doc?.status === 'error'

        return (
          <li
            key={id}
            className={`card flex items-center gap-3 px-3 py-2.5 ${hasError ? 'border-error/30 bg-error/5' : ''}`}
          >
            <FileKindBadge fileName={file.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{file.name}</p>
              <FileStatusLine file={uploadedFile} doc={doc} t={t} />
            </div>
            <button
              type="button"
              onClick={() => onRemove(id)}
              className="btn-ghost shrink-0 rounded-md p-2"
              aria-label={t('fileList.removeAriaLabel', { fileName: file.name })}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
