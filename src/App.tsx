import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_MODEL_ID,
  analyzeIntent,
  formatClarifiedQuery,
  modelLabel,
  runDeskResearch,
  type ClarifyingQuestion,
  type PipelineProgress as Progress,
  type ResearchBrief,
  type ResearchStage,
} from './agent'
import { ADMIN_PAGES, type AdminPageId } from './admin/pages'
import { AdminPanel } from './components/AdminPanel'
import { ClarifyingQuestions } from './components/ClarifyingQuestions'
import { CookingStatus } from './components/CookingStatus'
import { ModelPicker } from './components/ModelPicker'
import { ShareBriefBar } from './components/ShareBriefBar'
import { SourceList } from './components/SourceList'
import { SynthesisBrief } from './components/SynthesisBrief'
import { useVoiceInput } from './hooks/useVoiceInput'
import './App.css'

interface ClarifySession {
  originalQuery: string
  rationale: string
  questions: ClarifyingQuestion[]
  assumptions: string[]
}

type AppView = 'research' | 'admin'

const SUGGESTIONS = [
  'What is AgentChicago17B?',
  'How should desk research become one brief?',
  'Chicago as a research environment',
]

type ThemeMode = 'dark' | 'light'

function readStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem('agentchicago-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* ignore */
  }
  return 'dark'
}

export default function App() {
  const [query, setQuery] = useState('')
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID)
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState<ResearchStage>('idle')
  const [message, setMessage] = useState('')
  const [brief, setBrief] = useState<ResearchBrief | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [navOpen, setNavOpen] = useState(false)
  const [view, setView] = useState<AppView>('research')
  const [adminPage, setAdminPage] = useState<AdminPageId>('dashboard')
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme())
  const [clarify, setClarify] = useState<ClarifySession | null>(null)
  const [intentBusy, setIntentBusy] = useState(false)
  const queryRef = useRef(query)
  queryRef.current = query
  const voice = useVoiceInput({
    getBaseText: () => queryRef.current,
    onChange: setQuery,
  })

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.style.backgroundColor = theme === 'light' ? '#ffd0cd' : '#000000'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'light' ? '#ffd0cd' : '#000000')
    try {
      localStorage.setItem('agentchicago-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  function toggleTheme() {
    const root = document.documentElement
    root.classList.add('theme-animating')
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    window.setTimeout(() => root.classList.remove('theme-animating'), 220)
  }

  const hasResults =
    Boolean(brief) || running || Boolean(error) || Boolean(clarify) || intentBusy

  async function cookResearch(researchQuery: string) {
    setClarify(null)
    setRunning(true)
    setError(null)
    setBrief(null)
    setStage('scope')
    setMessage('Starting desk research…')

    try {
      const result = await runDeskResearch(
        researchQuery,
        (update: Progress) => {
          setStage(update.stage)
          setMessage(update.message)
        },
        { model: modelId },
      )
      setBrief(result)
      setStage('complete')
      setMessage(result.stageMessage)
      if (result.error) setError(result.error)
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Research failed'
      setError(text)
      setStage('error')
      setMessage(text)
    } finally {
      setRunning(false)
    }
  }

  async function handleResearch(nextQuery: string, options?: { skipIntent?: boolean }) {
    const trimmed = nextQuery.trim()
    if (!trimmed || running || intentBusy) return

    setNavOpen(false)
    setQuery(trimmed)
    setError(null)
    setBrief(null)
    setClarify(null)
    setHistory((prev) =>
      [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, 8),
    )

    if (options?.skipIntent) {
      await cookResearch(trimmed)
      return
    }

    setIntentBusy(true)
    setStage('clarify')
    setMessage('Making sure we understand…')

    try {
      const intent = await analyzeIntent(trimmed, { model: modelId })
      if (!intent.ready && intent.questions.length > 0) {
        setClarify({
          originalQuery: trimmed,
          rationale: intent.rationale,
          questions: intent.questions,
          assumptions: intent.assumptions,
        })
        setStage('clarify')
        setMessage('A couple of quick checks…')
        return
      }
      await cookResearch(trimmed)
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Could not start research'
      setError(text)
      setStage('error')
      setMessage(text)
    } finally {
      setIntentBusy(false)
    }
  }

  async function submitClarifications(answers: Record<string, string>) {
    if (!clarify || running) return
    const enriched = formatClarifiedQuery(
      clarify.originalQuery,
      clarify.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        answer: answers[q.id] ?? '',
      })),
    )
    setQuery(clarify.originalQuery)
    await cookResearch(enriched)
  }

  async function skipClarifications() {
    if (!clarify || running) return
    const original = clarify.originalQuery
    const assumptionLine =
      clarify.assumptions.length > 0
        ? `\n\nAssumptions (user skipped clarification):\n${clarify.assumptions.map((a) => `- ${a}`).join('\n')}`
        : ''
    await cookResearch(`${original}${assumptionLine}`)
  }

  function startNew() {
    setQuery('')
    setBrief(null)
    setError(null)
    setClarify(null)
    setIntentBusy(false)
    setStage('idle')
    setMessage('')
    setView('research')
    setNavOpen(false)
  }

  function openResearch() {
    setView('research')
    setNavOpen(false)
  }

  function openAdmin(page: AdminPageId = 'dashboard') {
    setAdminPage(page)
    setView('admin')
    setNavOpen(false)
  }

  const adminOpen = view === 'admin'

  return (
    <div className={`shell ${navOpen ? 'nav-open' : ''}`}>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Close menu"
        onClick={() => setNavOpen(false)}
      />

      <aside className="sidebar">
        <div className="brand-row">
          <span className="brand-mark" aria-hidden="true">
            <BrandMark size={28} />
          </span>
          <div className="brand-lockup">
            <span className="brand-name">
              <span>Agent</span>
              <span className="brand-name-accent">Chicago</span>
              <span>17B</span>
            </span>
            <span className="brand-tag">Deep research</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Workspace">
          <button type="button" className="nav-item" onClick={startNew}>
            <IconPlus />
            New research
          </button>
          <button
            type="button"
            className={`nav-item ${view === 'research' ? 'is-active' : ''}`}
            onClick={openResearch}
          >
            <IconSearch />
            Deep research
          </button>
          <button type="button" className="nav-item" disabled title="Coming next">
            <IconLayers />
            Sources
          </button>

          <div className="nav-group">
            <p className="nav-group-label">Admin</p>
            {ADMIN_PAGES.map((page) => (
              <button
                key={page.id}
                type="button"
                className={`nav-item nav-sub ${adminOpen && adminPage === page.id ? 'is-active' : ''}`}
                onClick={() => openAdmin(page.id)}
              >
                {page.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="side-section grow">
          <p className="side-label">Your research</p>
          {history.length === 0 ? (
            <p className="side-muted">No research yet</p>
          ) : (
            <ul className="history-list">
              {history.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => void handleResearch(item)}
                    disabled={running || intentBusy}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="side-cta">
          <p>
            Open source by <span className="side-cta-brand">HeySalad</span>
          </p>
          <span className="side-cta-chip">MIT</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-btn"
              aria-label="Open menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
            >
              <IconMenu />
            </button>
            <div className="topbar-status">
              {adminOpen ? (
                <span>
                  Admin ·{' '}
                  {ADMIN_PAGES.find((p) => p.id === adminPage)?.label ?? 'Admin'}
                </span>
              ) : running ? (
                <span className="topbar-cooking">Cooking your brief…</span>
              ) : brief ? (
                <span>Brief ready</span>
              ) : (
                <span>Ready when you are</span>
              )}
            </div>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="theme-toggle"
              role="switch"
              aria-checked={theme === 'light'}
              aria-label={
                theme === 'dark' ? 'Switch to light background' : 'Switch to dark background'
              }
              onClick={toggleTheme}
            >
              <span className="theme-toggle-track">
                <span className="theme-toggle-thumb" />
              </span>
              <span className="theme-toggle-label">
                {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </button>
            <span className="stage-chip" data-stage={stage}>
              {stageLabel(stage)}
            </span>
          </div>
        </header>

        <main
          className={`canvas ${
            view === 'admin' ? 'has-results' : hasResults ? 'has-results' : 'is-empty'
          }`}
        >
          {view === 'admin' ? (
            <AdminPanel page={adminPage} onNavigate={openAdmin} />
          ) : !hasResults ? (
            <section className="empty-state">
              <div className="empty-brand">
                <span className="empty-logo" aria-hidden="true">
                  <BrandMark size={64} />
                </span>
                <p className="empty-brand-name">
                  <span>Agent</span>
                  <span className="brand-name-accent">Chicago</span>
                  <span>17B</span>
                </p>
                <p className="empty-byline">
                  Open source by <span className="side-cta-brand">HeySalad</span>
                </p>
                <hr className="lake-rule" />
              </div>
              <h1>One brief. Deep as the dish.</h1>
              <p className="empty-lede">
                Ask anything. We’ll research it and serve one clear brief —
                simple as chatting, deeper than a quick answer.
              </p>
              <ul className="suggestion-list">
                {SUGGESTIONS.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => handleResearch(suggestion)}
                      disabled={running || intentBusy}
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="results">
              {clarify && !running ? (
                <ClarifyingQuestions
                  originalQuery={clarify.originalQuery}
                  rationale={clarify.rationale}
                  questions={clarify.questions}
                  assumptions={clarify.assumptions}
                  busy={running}
                  onSubmit={(answers) => void submitClarifications(answers)}
                  onSkip={() => void skipClarifications()}
                />
              ) : null}

              {running || intentBusy ? (
                <CookingStatus
                  query={query}
                  stage={stage}
                  message={message}
                  modelLabel={modelLabel(modelId)}
                />
              ) : null}

              {error ? (
                <div className="error-banner" role="alert">
                  {error}
                </div>
              ) : null}

              {brief ? (
                <>
                  <div className="query-echo">
                    <p>{brief.query.split('\n')[0]}</p>
                    <span>{modelLabel(modelId)}</span>
                  </div>
                  <ShareBriefBar brief={brief} />
                  <SynthesisBrief brief={brief} />
                  <SourceList brief={brief} />
                </>
              ) : null}
            </section>
          )}
        </main>

        {view === 'research' ? (
          <form
            className={`composer ${running || intentBusy ? 'is-cooking' : ''}`}
            onSubmit={(event) => {
              event.preventDefault()
              void handleResearch(query)
            }}
          >
            <div className="composer-main">
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void handleResearch(query)
                  }
                }}
                placeholder="Ask anything…"
                disabled={running || intentBusy}
                aria-label="Research question"
                rows={1}
              />
              <div className="composer-toolbar">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="New research"
                  onClick={startNew}
                >
                  <IconPlus />
                </button>
                <button
                  type="button"
                  className={`icon-btn mic-btn ${voice.isRecording ? 'is-recording' : ''} ${voice.status === 'transcribing' ? 'is-transcribing' : ''}`}
                  aria-label={
                    voice.isRecording
                      ? 'Stop listening'
                      : voice.status === 'transcribing'
                        ? 'Transcribing…'
                        : 'Speak your question'
                  }
                  aria-pressed={voice.isRecording}
                  disabled={
                    running || intentBusy || voice.status === 'transcribing'
                  }
                  onClick={() => {
                    voice.clearError()
                    void voice.toggle()
                  }}
                >
                  {voice.status === 'transcribing' ? <MicSpinner /> : <IconMic />}
                </button>
                <ModelPicker
                  value={modelId}
                  disabled={running || intentBusy || voice.isBusy}
                  onChange={setModelId}
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={
                    running || intentBusy || voice.isBusy || !query.trim()
                  }
                  aria-label="Run desk research"
                >
                  {running || intentBusy ? <CookingSpinner /> : <IconArrowUp />}
                </button>
              </div>
              {voice.error ? (
                <p className="composer-voice-error" role="status">
                  {voice.error}
                </p>
              ) : voice.isRecording ? (
                <p className="composer-voice-hint" role="status">
                  Listening… words appear as you speak — tap the mic when you’re done
                </p>
              ) : voice.status === 'transcribing' ? (
                <p className="composer-voice-hint" role="status">
                  Finishing the last words…
                </p>
              ) : null}
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}

function stageLabel(stage: ResearchStage): string {
  switch (stage) {
    case 'idle':
      return 'Ready'
    case 'clarify':
      return 'Clarify'
    case 'scope':
      return 'Starting'
    case 'plan':
      return 'Planning'
    case 'gather':
      return 'Gathering'
    case 'extract':
      return 'Reading'
    case 'synthesize':
      return 'Cooking'
    case 'critique':
      return 'QA'
    case 'complete':
      return 'Done'
    case 'error':
      return 'Needs a look'
    default:
      return 'Working'
  }
}

/** Official brand mark — deep-dish slice + Chicago star. */
function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <img
      className="brand-mark-img"
      src="/brand/mark-color-clear.png"
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  )
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16.5 16.5L20 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 4l8 4-8 4-8-4 8-4zm0 8l8 4-8 4-8-4 8-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconArrowUp() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CookingSpinner() {
  return (
    <span className="send-cook-spin" aria-hidden="true">
      <img src="/brand/mark-color-clear.png" alt="" width={18} height={18} />
    </span>
  )
}

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect
        x="9"
        y="3.5"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M6.5 11.5a5.5 5.5 0 0011 0M12 17v3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MicSpinner() {
  return (
    <span className="mic-spinner" aria-hidden="true">
      <IconMic />
    </span>
  )
}
