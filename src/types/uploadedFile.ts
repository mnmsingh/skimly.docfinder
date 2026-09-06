import type { TranslationKey } from '../i18n/translations'

/** Whether a selected file passed validation and is ready to be parsed, or failed it. */
export type UploadedFileStatus = 'ready' | 'error'

/** A file the user has selected for upload, along with its validation result. */
export interface UploadedFile {
  /** Stable identifier for this selection, used as the React list key and for removal. */
  id: string
  /** The raw browser File object selected via drag-drop or the file picker. */
  file: File
  /** 'ready' if the file passed validation, 'error' if it should be rejected. */
  status: UploadedFileStatus
  /** Translation key for why the file was rejected. Only set when status is 'error'. */
  errorKey?: TranslationKey
  /** Values to fill into `errorKey`'s `{{param}}` placeholders (e.g. the file extension). */
  errorParams?: Record<string, string | number>
}
