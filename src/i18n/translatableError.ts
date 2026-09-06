import type { TranslationKey } from './translations'

/**
 * An error whose user-facing message is a translation key (plus optional
 * `{{param}}` values) instead of a fixed English string, so it can be
 * rendered in whichever UI language is active. Thrown by the file
 * validation and parsing code; components render it via `t(error.key,
 * error.params)`.
 */
export class TranslatableError extends Error {
  readonly key: TranslationKey
  readonly params?: Record<string, string | number>

  constructor(key: TranslationKey, params?: Record<string, string | number>) {
    super(key)
    this.key = key
    this.params = params
  }
}
