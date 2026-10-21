import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react'
import type { Issue, Lang, Pack, Prompt, StatusNotice } from './types'
import { getTranslator, type T, type TKey } from './i18n'
import {
  DEFAULT_EPISODE_ID,
  DEFAULT_PACK_NAME,
  FIRST_PROMPT_ID,
  SPEEDS,
  autoDurationForPrompt,
  createDefaultPack,
  makePrompt,
  nextPromptId,
  parsePromptList,
  speedFromStorage,
} from './lib/prompts'
import { countIssues, validatePack } from './lib/validation'
import {
  ContentError,
  exportContentZip,
  importContentZip,
  type ContentErrorCode,
  type ImportSummary,
} from './lib/content'

const STORAGE_KEY = 'quiphuts:draft:v1'
const LANG_KEY = 'quiphuts:lang:v1'

function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored === 'en' || stored === 'hu') return stored
  } catch {
    // localStorage can be disabled.
  }
  return navigator.language.toLowerCase().startsWith('hu') ? 'hu' : 'en'
}

function loadPack(): Pack {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultPack()
    const parsed = JSON.parse(raw) as {
      name?: unknown
      prompts?: unknown
      episodeId?: unknown
      speed?: unknown
    }
    if (!parsed || !Array.isArray(parsed.prompts)) return createDefaultPack()

    const prompts: Prompt[] = parsed.prompts
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry, index) => {
        const id = Number(entry.id)
        return {
          id: Number.isInteger(id) && id > 0 ? id : FIRST_PROMPT_ID + index,
          text: typeof entry.text === 'string' ? entry.text : '',
          explicit: Boolean(entry.explicit),
        }
      })

    const episodeId = Number(parsed.episodeId)
    return {
      name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_PACK_NAME,
      prompts,
      episodeId:
        Number.isFinite(episodeId) && episodeId > 0 ? Math.floor(episodeId) : DEFAULT_EPISODE_ID,
      speed: speedFromStorage(parsed.speed),
    }
  } catch {
    return createDefaultPack()
  }
}

function savePack(pack: Pack): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pack))
  } catch {
    // The app still works without persistence.
  }
}

function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    // The app still works without persistence.
  }
}

function downloadBlob(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function issueText(issue: Issue, t: T): string {
  return t(`issue.${issue.code}` as TKey, issue.params)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function importErrorKey(code: ContentErrorCode): TKey {
  switch (code) {
    case 'invalidZip':
      return 'status.invalidZip'
    case 'noQuestionJet':
      return 'status.noQuestionJet'
    case 'badQuestionJet':
      return 'status.badQuestionJet'
    case 'noPrompts':
      return 'status.noPromptsInZip'
  }
}

export default function App() {
  const [pack, setPack] = useState<Pack>(loadPack)
  const [lang, setLang] = useState<Lang>(loadLang)
  const [pasteText, setPasteText] = useState('')
  const [status, setStatus] = useState<StatusNotice | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [busy, setBusy] = useState<'import' | 'export' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const t = useMemo(() => getTranslator(lang), [lang])
  const issues = useMemo(() => validatePack(pack), [pack])
  const counts = useMemo(() => countIssues(issues), [issues])

  useEffect(() => {
    savePack(pack)
  }, [pack])

  useEffect(() => {
    saveLang(lang)
    document.documentElement.lang = lang
  }, [lang])

  const updatePrompt = (id: number, patch: Partial<Prompt>) => {
    setPack((previous) => ({
      ...previous,
      prompts: previous.prompts.map((prompt) =>
        prompt.id === id ? { ...prompt, ...patch } : prompt,
      ),
    }))
  }

  const handleAppendList = () => {
    const lines = parsePromptList(pasteText)
    if (lines.length === 0) {
      setStatus({ kind: 'error', key: 'status.noPaste' })
      return
    }
    setPack((previous) => {
      const startId = nextPromptId(previous.prompts)
      return {
        ...previous,
        prompts: [
          ...previous.prompts,
          ...lines.map((text, index) => makePrompt(startId + index, text)),
        ],
      }
    })
    setImportSummary(null)
    setStatus({
      kind: 'success',
      key: 'status.listAppended',
      params: { count: lines.length },
    })
    setPasteText('')
  }

  const handleAddPrompt = () => {
    setPack((previous) => ({
      ...previous,
      prompts: [...previous.prompts, makePrompt(nextPromptId(previous.prompts))],
    }))
    setImportSummary(null)
  }

  const handleClear = () => {
    if (!window.confirm(t('prompts.clearConfirm'))) return
    setPack((previous) => ({ ...createDefaultPack(), speed: previous.speed }))
    setImportSummary(null)
    setPasteText('')
    setStatus({ kind: 'info', key: 'status.cleared' })
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    if (pack.prompts.length > 0 && !window.confirm(t('paste.importConfirm'))) {
      return
    }

    setBusy('import')
    setImportSummary(null)
    setStatus({ kind: 'info', key: 'status.importing' })

    let bytes: Uint8Array
    try {
      bytes = new Uint8Array(await file.arrayBuffer())
    } catch {
      setStatus({ kind: 'error', key: 'status.fileReadError' })
      setBusy(null)
      return
    }

    try {
      const result = importContentZip(bytes)
      setPack((previous) => ({
        ...createDefaultPack(),
        name: result.packName,
        prompts: result.prompts,
        episodeId: result.episodeId,
        speed: previous.speed,
      }))
      setImportSummary(result)
      setPasteText('')
      setStatus({
        kind: 'success',
        key: 'status.importSuccess',
        params: { count: result.prompts.length },
      })
    } catch (error) {
      if (error instanceof ContentError) {
        setStatus({ kind: 'error', key: importErrorKey(error.code) })
      } else {
        setStatus({
          kind: 'error',
          key: 'status.importFailed',
          params: { message: errorMessage(error) },
        })
      }
    } finally {
      setBusy(null)
    }
  }

  const handleExport = async () => {
    if (counts.errors > 0) {
      setStatus({ kind: 'error', key: 'issues.exportBlocked' })
      return
    }
    if (pack.prompts.length === 0) {
      setStatus({ kind: 'error', key: 'export.noPrompts' })
      return
    }

    setBusy('export')
    setStatus({ kind: 'info', key: 'status.exporting' })

    try {
      const bytes = await exportContentZip(pack)
      downloadBlob(bytes, 'content.zip')
      setStatus({ kind: 'success', key: 'status.exportSuccess' })
    } catch (error) {
      setStatus({
        kind: 'error',
        key: 'status.exportFailed',
        params: { message: errorMessage(error) },
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="app">
      <div className="app-glow" aria-hidden="true" />
      <Header lang={lang} t={t} onLangChange={setLang} />

      <main className="layout">
        <section className="main-column" aria-label={t('prompts.title')}>
          {status ? (
            <StatusBanner status={status} t={t} onDismiss={() => setStatus(null)} />
          ) : null}

          {importSummary ? (
            <ImportSummaryCard
              summary={importSummary}
              t={t}
              onDismiss={() => setImportSummary(null)}
            />
          ) : null}

          <PasteCard
            value={pasteText}
            busy={busy}
            t={t}
            fileInputRef={fileInputRef}
            onChange={setPasteText}
            onAppend={handleAppendList}
            onImportClick={handleImportClick}
            onFileChange={handleFileChange}
          />

          <PromptList
            pack={pack}
            issues={issues}
            t={t}
            onAdd={handleAddPrompt}
            onClear={handleClear}
            onChangeText={(id, text) => updatePrompt(id, { text })}
            onRemove={(id) =>
              setPack((previous) => ({
                ...previous,
                prompts: previous.prompts.filter((prompt) => prompt.id !== id),
              }))
            }
          />
        </section>

        <aside className="side-column" aria-label={t('settings.title')}>
          <SettingsCard
            pack={pack}
            t={t}
            onNameChange={(name) => setPack((previous) => ({ ...previous, name }))}
            onSpeedChange={(speed) => setPack((previous) => ({ ...previous, speed }))}
            onEpisodeChange={(episodeId) =>
              setPack((previous) => ({ ...previous, episodeId }))
            }
          />

          <IssuesCard issues={issues} counts={counts} t={t} />

          <ExportCard
            pack={pack}
            counts={counts}
            busy={busy}
            t={t}
            onExport={handleExport}
          />
        </aside>
      </main>

      <footer className="footer">
        <p>{t('app.footer')}</p>
      </footer>
    </div>
  )
}

function Header({
  lang,
  t,
  onLangChange,
}: {
  lang: Lang
  t: T
  onLangChange: (lang: Lang) => void
}) {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          Q
        </div>
        <div>
          <h1>{t('app.name')}</h1>
          <p>{t('app.tagline')}</p>
        </div>
      </div>
      <div className="lang-switch" role="group" aria-label={t('app.language')}>
        <button
          type="button"
          className={lang === 'en' ? 'is-active' : ''}
          aria-pressed={lang === 'en'}
          onClick={() => onLangChange('en')}
        >
          {t('app.langEn')}
        </button>
        <button
          type="button"
          className={lang === 'hu' ? 'is-active' : ''}
          aria-pressed={lang === 'hu'}
          onClick={() => onLangChange('hu')}
        >
          {t('app.langHu')}
        </button>
      </div>
    </header>
  )
}

function StatusBanner({
  status,
  t,
  onDismiss,
}: {
  status: StatusNotice
  t: T
  onDismiss: () => void
}) {
  return (
    <div
      className={`status-banner is-${status.kind}`}
      role={status.kind === 'error' ? 'alert' : 'status'}
    >
      <span>{t(status.key as TKey, status.params)}</span>
      <button type="button" className="dismiss-button" onClick={onDismiss} aria-label={t('import.close')}>
        ×
      </button>
    </div>
  )
}

function PasteCard({
  value,
  busy,
  t,
  fileInputRef,
  onChange,
  onAppend,
  onImportClick,
  onFileChange,
}: {
  value: string
  busy: 'import' | 'export' | null
  t: T
  fileInputRef: RefObject<HTMLInputElement | null>
  onChange: (value: string) => void
  onAppend: () => void
  onImportClick: () => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <h2>{t('paste.title')}</h2>
          <p>{t('paste.description')}</p>
        </div>
      </div>
      <textarea
        className="paste-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('paste.placeholder')}
        rows={7}
        spellCheck={false}
      />
      <div className="button-row">
        <button type="button" className="button primary" onClick={onAppend}>
          {t('paste.append')}
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={onImportClick}
          disabled={busy !== null}
        >
          {busy === 'import' ? t('paste.importing') : t('paste.import')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="visually-hidden"
          onChange={onFileChange}
          tabIndex={-1}
        />
      </div>
      <p className="hint">{t('paste.hint')}</p>
    </section>
  )
}

function PromptList({
  pack,
  issues,
  t,
  onAdd,
  onClear,
  onChangeText,
  onRemove,
}: {
  pack: Pack
  issues: Issue[]
  t: T
  onAdd: () => void
  onClear: () => void
  onChangeText: (id: number, text: string) => void
  onRemove: (id: number) => void
}) {
  return (
    <section className="card prompt-card">
      <div className="card-heading prompt-heading">
        <div>
          <h2>{t('prompts.title')}</h2>
          <p>{t('prompts.count', { count: pack.prompts.length })}</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="button secondary compact" onClick={onAdd}>
            + {t('prompts.add')}
          </button>
          <button type="button" className="text-button danger-text" onClick={onClear}>
            {t('prompts.clear')}
          </button>
        </div>
      </div>

      {pack.prompts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-mark" aria-hidden="true">
            +
          </div>
          <h3>{t('prompts.emptyTitle')}</h3>
          <p>{t('prompts.emptyBody')}</p>
        </div>
      ) : (
        <div className="prompt-list">
          {pack.prompts.map((prompt, index) => {
            const promptIssues = issues.filter((issue) => issue.index === index)
            return (
              <PromptRow
                key={`${prompt.id}-${index}`}
                prompt={prompt}
                index={index}
                speed={pack.speed}
                promptIssues={promptIssues}
                t={t}
                onChangeText={onChangeText}
                onRemove={onRemove}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

function PromptRow({
  prompt,
  index,
  speed,
  promptIssues,
  t,
  onChangeText,
  onRemove,
}: {
  prompt: Prompt
  index: number
  speed: number
  promptIssues: Issue[]
  t: T
  onChangeText: (id: number, text: string) => void
  onRemove: (id: number) => void
}) {
  const errorCount = promptIssues.filter((issue) => issue.severity === 'error').length
  const warningCount = promptIssues.filter((issue) => issue.severity === 'warning').length
  const issueTitle = promptIssues.map((issue) => issueText(issue, t)).join('\n')
  const duration = autoDurationForPrompt(prompt.text, speed)
  const blankCount = prompt.text.match(/<BLANK>/g)?.length ?? 0

  return (
    <div className="prompt-row">
      <div className="prompt-index" aria-hidden="true">
        {index + 1}
      </div>
      <div className="prompt-main">
        <input
          className="prompt-input"
          type="text"
          value={prompt.text}
          onChange={(event) => onChangeText(prompt.id, event.target.value)}
          aria-label={t('issues.prompt', { number: index + 1 })}
          spellCheck={false}
        />
        <div className="prompt-meta">
          <span>{t('prompts.charCount', { count: prompt.text.length })}</span>
          <span>{t('prompts.blankCount', { count: blankCount })}</span>
          {errorCount > 0 ? (
            <span className="issue-pill is-error" title={issueTitle}>
              {t('prompts.error')}
              {errorCount > 1 ? ` ${errorCount}` : ''}
            </span>
          ) : null}
          {warningCount > 0 ? (
            <span className="issue-pill is-warning" title={issueTitle}>
              {t('prompts.warning')}
              {warningCount > 1 ? ` ${warningCount}` : ''}
            </span>
          ) : null}
          <span className="duration-display" title={t('prompts.duration')}>
            {duration.toFixed(1)} {t('prompts.seconds')}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={() => onRemove(prompt.id)}
        aria-label={t('prompts.remove')}
        title={t('prompts.remove')}
      >
        ×
      </button>
    </div>
  )
}

function SettingsCard({
  pack,
  t,
  onNameChange,
  onSpeedChange,
  onEpisodeChange,
}: {
  pack: Pack
  t: T
  onNameChange: (name: string) => void
  onSpeedChange: (speed: number) => void
  onEpisodeChange: (episodeId: number) => void
}) {
  return (
    <section className="card">
      <h2>{t('settings.title')}</h2>

      <label className="field">
        <span>{t('settings.packName')}</span>
        <input
          type="text"
          value={pack.name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t('settings.packNamePlaceholder')}
          spellCheck={false}
        />
      </label>

      <details className="advanced">
        <summary>{t('settings.advanced')}</summary>
        <h3 className="advanced-title">{t('settings.durationTitle')}</h3>
        <label className="field">
          <span>{t('settings.speed')}</span>
          <select
            value={String(pack.speed)}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          >
            {SPEEDS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey as TKey)}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">{t('settings.speedHint')}</p>
        <label className="field">
          <span>{t('settings.episode')}</span>
          <input
            type="number"
            min={1}
            step={1}
            value={pack.episodeId}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value) && value > 0) {
                onEpisodeChange(Math.floor(value))
              }
            }}
          />
        </label>
        <p className="hint">{t('settings.episodeHint')}</p>
      </details>
    </section>
  )
}

function ExportCard({
  pack,
  counts,
  busy,
  t,
  onExport,
}: {
  pack: Pack
  counts: { errors: number; warnings: number }
  busy: 'import' | 'export' | null
  t: T
  onExport: () => void
}) {
  const disabled = busy !== null

  return (
    <section className="card export-card">
      <h2>{t('export.title')}</h2>
      <p>{t('export.description')}</p>
      <p className="export-summary">
        {t('export.summary', { prompts: pack.prompts.length })}
      </p>
      <p className={counts.errors > 0 ? 'bad-text' : 'good-text'}>
        {counts.errors > 0
          ? t('issues.exportBlocked')
          : pack.prompts.length > 0
            ? t('export.ready')
            : t('export.noPrompts')}
      </p>

      <div className="button-stack">
        <button
          type="button"
          className="button primary"
          onClick={onExport}
          disabled={disabled || counts.errors > 0 || pack.prompts.length === 0}
        >
          {busy === 'export' ? t('export.busy') : t('export.button')}
        </button>
      </div>

      <div className="install-note">
        <h3>{t('export.installTitle')}</h3>
        <p>{t('export.install')}</p>
        <p className="hint">{t('export.installNote')}</p>
      </div>
    </section>
  )
}

function IssuesCard({
  issues,
  counts,
  t,
}: {
  issues: Issue[]
  counts: { errors: number; warnings: number }
  t: T
}) {
  const visibleIssues = issues.slice(0, 40)
  const hiddenCount = Math.max(0, issues.length - visibleIssues.length)

  return (
    <section className="card">
      <div className="card-heading prompt-heading">
        <h2>{t('issues.title')}</h2>
        <div className="issue-counts">
          <span className={counts.errors > 0 ? 'is-error' : ''}>
            {t('issues.errors', { count: counts.errors })}
          </span>
          <span className={counts.warnings > 0 ? 'is-warning' : ''}>
            {t('issues.warnings', { count: counts.warnings })}
          </span>
        </div>
      </div>

      {issues.length === 0 ? (
        <p className="good-text">{t('issues.none')}</p>
      ) : (
        <>
          <p className={counts.errors > 0 ? 'bad-text' : 'good-text'}>
            {counts.errors > 0 ? t('issues.exportBlocked') : t('issues.exportAllowed')}
          </p>
          <ul className="issue-list">
            {visibleIssues.map((issue, index) => (
              <li key={`${issue.code}-${issue.promptId ?? 'pack'}-${index}`} className={`is-${issue.severity}`}>
                <span className="issue-scope">
                  {issue.index !== undefined
                    ? t('issues.prompt', { number: issue.index + 1 })
                    : t('issues.general')}
                </span>
                <span>{issueText(issue, t)}</span>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 ? (
            <p className="hint">{t('issues.more', { count: hiddenCount })}</p>
          ) : null}
        </>
      )}
    </section>
  )
}

function ImportSummaryCard({
  summary,
  t,
  onDismiss,
}: {
  summary: ImportSummary
  t: T
  onDismiss: () => void
}) {
  const items: Array<{ key: TKey; params?: Record<string, string | number> }> = [
    { key: 'import.prompts', params: { count: summary.prompts.length } },
    { key: 'import.packName', params: { name: summary.packName } },
  ]

  if (summary.mp3Count > 0) {
    items.push({ key: 'import.mp3', params: { count: summary.mp3Count } })
  }
  if (summary.customCount > 0) {
    items.push({ key: 'import.custom' })
  }
  if (summary.textMismatchCount > 0) {
    items.push({ key: 'import.mismatch', params: { count: summary.textMismatchCount } })
  }
  if (summary.fakeJokeCount > 0) {
    items.push({ key: 'import.fakeJoke', params: { count: summary.fakeJokeCount } })
  }
  if (summary.manifestMissing) {
    items.push({ key: 'import.manifestMissing' })
  }
  if (summary.assignedIds > 0) {
    items.push({ key: 'import.assignedIds', params: { count: summary.assignedIds } })
  }
  if (summary.duplicateIds > 0) {
    items.push({ key: 'import.duplicateIds', params: { count: summary.duplicateIds } })
  }
  if (summary.skippedPrompts > 0) {
    items.push({ key: 'import.skipped', params: { count: summary.skippedPrompts } })
  }
  items.push({ key: 'import.audioIgnored' })

  return (
    <section className="card import-summary">
      <div className="card-heading prompt-heading">
        <h2>{t('import.title')}</h2>
        <button type="button" className="text-button" onClick={onDismiss}>
          {t('import.close')}
        </button>
      </div>
      <ul className="summary-list">
        {items.map((item, index) => (
          <li key={`${item.key}-${index}`}>{t(item.key, item.params)}</li>
        ))}
      </ul>
    </section>
  )
}
