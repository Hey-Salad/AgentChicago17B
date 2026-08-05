import { useState } from 'react'
import { continueEveSession, readEveStream, startEveSession } from '../../eve/client'

/**
 * Talk to the durable Eve agent (Workflows + Sandbox) from the Admin desk.
 * Requires a parallel `npm run eve` process (or hosted Eve deployment).
 */
export function EveDeskPage() {
  const [message, setMessage] = useState(
    'What is AgentChicago17B and how should desk research become one brief?',
  )
  const [log, setLog] = useState<string[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function push(line: string) {
    setLog((prev) => [...prev.slice(-200), line])
  }

  async function run() {
    const text = message.trim()
    if (!text || busy) return
    setBusy(true)
    setError(null)
    push(`› ${text}`)
    try {
      const started = token
        ? await continueEveSession(token, text)
        : await startEveSession(text)
      if (started.sessionId) setSessionId(started.sessionId)
      if (started.continuationToken) setToken(started.continuationToken)
      push(`session ${started.sessionId || '(see response)'} · durable Workflow turn started`)

      const sid = started.sessionId
      if (sid) {
        await readEveStream(sid, (line) => {
          try {
            const event = JSON.parse(line) as { type?: string; text?: string; message?: string }
            if (event.text) push(event.text)
            else if (event.message) push(String(event.message))
            else push(line.slice(0, 280))
          } catch {
            push(line.slice(0, 280))
          }
        })
      } else {
        push(JSON.stringify(started.body).slice(0, 800))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eve request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ad-shell ad-shell-simple">
      <header className="ad-top">
        <div>
          <h1 className="ad-title">Eve desk</h1>
          <p className="ad-sub">
            Durable AgentChicago17B on Eve — Vercel Workflows for session persistence, Vercel
            Sandbox for isolated gather/extract. Classic Deep research stays on the Vite LLM proxy.
          </p>
        </div>
      </header>

      <section className="ad-card">
        <div className="ad-card-head">
          <h2>How to run</h2>
          <p>Two terminals. Node 24+ recommended for Eve.</p>
        </div>
        <div className="ad-card-body">
          <ol>
            <li>
              <code>npm install</code> (pulls <code>eve</code>, <code>ai</code>, <code>zod</code>)
            </li>
            <li>
              Terminal A: <code>npm run eve</code>
            </li>
            <li>
              Terminal B: <code>npm run dev</code> → this page
            </li>
            <li>
              Set <code>CF_ACCOUNT_ID</code> + <code>CF_API_TOKEN</code> (Cloudflare AI Gateway /
              Workers AI). Optional: <code>EVE_MODEL=@cf/zai-org/glm-5.2</code>
            </li>
          </ol>
        </div>
      </section>

      <section className="ad-card" style={{ marginTop: 16 }}>
        <div className="ad-card-head">
          <h2>Session</h2>
          <p>Starts a durable Eve turn; stream events appear below.</p>
        </div>
        <div className="ad-card-body" style={{ display: 'grid', gap: 12 }}>
          <label htmlFor="eve-msg">Research message</label>
          <textarea
            id="eve-msg"
            rows={4}
            value={message}
            disabled={busy}
            onChange={(e) => setMessage(e.target.value)}
            style={{
              width: '100%',
              borderRadius: 12,
              padding: 12,
              font: 'inherit',
              background: 'var(--ad-input-bg, #0a0a0a)',
              color: 'inherit',
              border: '1px solid color-mix(in srgb, #fff 14%, transparent)',
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="ad-btn ad-btn-primary"
              disabled={busy}
              onClick={() => void run()}
            >
              {busy ? 'Cooking…' : token ? 'Continue session' : 'Start Eve session'}
            </button>
            <button
              type="button"
              className="ad-btn ad-btn-ghost"
              disabled={busy}
              onClick={() => {
                setToken(null)
                setSessionId(null)
                setLog([])
                setError(null)
              }}
            >
              Reset
            </button>
          </div>
          {sessionId ? (
            <p className="ad-sub">
              Session <code>{sessionId}</code>
              {token ? ' · continuation ready' : ''}
            </p>
          ) : null}
          {error ? (
            <p role="alert" style={{ color: '#ff8b8b', margin: 0 }}>
              {error}
            </p>
          ) : null}
          <pre
            style={{
              margin: 0,
              minHeight: 180,
              whiteSpace: 'pre-wrap',
              padding: 12,
              borderRadius: 12,
              background: 'color-mix(in srgb, #000 35%, transparent)',
              fontSize: 13,
            }}
          >
            {log.length ? log.join('\n') : 'Eve stream output appears here…'}
          </pre>
        </div>
      </section>

      <p className="ad-sub" style={{ marginTop: 16 }}>
        Docs: <code>docs/eve-integration.md</code>
      </p>
    </div>
  )
}
