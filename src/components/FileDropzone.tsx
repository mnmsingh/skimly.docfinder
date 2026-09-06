import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import type { TFunction } from '../hooks/useLanguage'

interface FileDropzoneProps {
  /** Called with the raw FileList chosen via drag-drop or the file picker. */
  onFilesSelected: (files: FileList) => void
  t: TFunction
}

/**
 * Drag-and-drop + click-to-browse area for selecting PDF/DOCX files.
 *
 * This component only captures the user's file selection and forwards the
 * raw FileList via `onFilesSelected` — it does not validate file types or
 * sizes itself (that's the caller's responsibility, e.g. `useFileUpload`).
 *
 * @param onFilesSelected - Called whenever the user drops files or picks
 * them from the browse dialog.
 */
export function FileDropzone({ onFilesSelected, t }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const openPicker = useCallback(() => inputRef.current?.click(), [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragOver(false)
      if (event.dataTransfer.files.length > 0) {
        onFilesSelected(event.dataTransfer.files)
      }
    },
    [onFilesSelected],
  )

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        onFilesSelected(event.target.files)
      }
      event.target.value = ''
    },
    [onFilesSelected],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openPicker()
      }
    },
    [openPicker],
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      aria-label={t('dropzone.ariaLabel')}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 ${
        isDragOver
          ? 'border-primary bg-primary/10'
          : 'border-border-strong bg-surface hover:border-muted hover:bg-muted/5'
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150 ${
          isDragOver ? 'bg-primary text-white' : 'bg-muted/10 text-muted'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M12 15V4m0 0 4 4m-4-4-4 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
        <span className="text-primary">{t('dropzone.clickToBrowse')}</span> {t('dropzone.orDragAndDrop')}
      </p>
      <p className="mt-1 text-xs text-muted">{t('dropzone.formats')}</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}
