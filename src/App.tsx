import { useMemo, useState } from 'react'
import { FileDropzone } from './components/FileDropzone'
import { FileList } from './components/FileList'
import { SearchBar } from './components/SearchBar'
import { SearchResults } from './components/SearchResults'
import { ThemeToggle } from './components/ThemeToggle'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { OcrLanguageSelect } from './components/OcrLanguageSelect'
import { useFileUpload } from './hooks/useFileUpload'
import { useDocumentIndex } from './hooks/useDocumentIndex'
import { useOcrLanguage } from './hooks/useOcrLanguage'
import { useSearchIndex } from './hooks/useSearchIndex'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useTheme } from './hooks/useTheme'
import { useLanguage } from './hooks/useLanguage'

/**
 * Root component for skimly.docfinder — a static, client-side document search app.
 *
 * Wires together file selection/validation (`useFileUpload`), parsing PDF/DOCX
 * files into text chunks (`useDocumentIndex`), building a full-text search
 * index over those chunks (`useSearchIndex`), and the search UI. Everything
 * runs in the browser — files are never uploaded anywhere.
 *
 * The UI itself can display in English, Hindi, or Marathi (`useLanguage`);
 * this is independent of the uploaded documents' language, which can be
 * any of the three (or mixed) regardless of the UI language chosen here.
 */
function App() {
  const { files, addFiles, removeFile } = useFileUpload()
  const { ocrLanguage, setOcrLanguage } = useOcrLanguage()
  const { documents } = useDocumentIndex(files, ocrLanguage)
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 200)

  const chunks = useMemo(
    () =>
      Object.values(documents)
        .filter((doc) => doc.status === 'done')
        .flatMap((doc) => doc.chunks),
    [documents],
  )
  const { search } = useSearchIndex(chunks)
  const results = useMemo(() => search(debouncedQuery), [search, debouncedQuery])
  const hasSearchableDocuments = chunks.length > 0

  return (
    <div className="flex min-h-screen flex-col bg-background text-slate-900 dark:text-slate-100">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-4 py-4 sm:px-6">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M9 4h6l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M9 13.5h6M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="10" cy="10" r="1.75" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">
              skimly.docfinder
            </h1>
            <p className="truncate text-xs text-muted">{t('app.tagline')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher language={language} onChange={setLanguage} t={t} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} t={t} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('upload.heading')}</h2>
          <p className="mt-1 text-sm text-muted">{t('upload.description')}</p>
        </div>

        <FileDropzone onFilesSelected={addFiles} t={t} />
        <OcrLanguageSelect value={ocrLanguage} onChange={setOcrLanguage} t={t} />
        <FileList files={files} documents={documents} onRemove={removeFile} t={t} />

        {files.length === 0 && (
          <div className="mt-6 flex items-start gap-3 rounded-card border border-dashed border-border-strong bg-surface px-4 py-3.5 text-sm text-muted">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="m20 20-3.6-3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <p>{t('upload.emptyState')}</p>
          </div>
        )}

        <div className="mt-10 border-t border-border pt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('search.heading')}</h2>
          <p className="mt-1 text-sm text-muted">{t('search.description')}</p>
          <div className="mt-4">
            <SearchBar value={query} onChange={setQuery} t={t} />
          </div>
          <SearchResults
            query={debouncedQuery}
            results={results}
            hasSearchableDocuments={hasSearchableDocuments}
            t={t}
          />
        </div>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-4 text-xs text-muted sm:px-6">{t('footer.text')}</div>
      </footer>
    </div>
  )
}

export default App
