import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_MODEL_ID,
  RESEARCH_MODELS,
} from '../../agent/models'
import { extractMessageContent } from '../../agent/synthesisParse'
import { getCritiqueSystemPrompt, getIntentSystemPrompt } from '../../admin/skillStore'

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

type SystemTemplate = {
  id: string
  label: string
  system: () => string
  starter?: string
}

const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    id: 'default',
    label: 'Simple chat',
    system: () =>
      'You are a helpful assistant. Be clear and concise.',
    starter: 'Explain desk research in one short paragraph.',
  },
  {
    id: 'intent',
    label: 'Intent agent',
    system: () => getIntentSystemPrompt(),
    starter: 'Tell me about Chicago',
  },
  {
    id: 'critique',
    label: 'Critique agent',
    system: () => getCritiqueSystemPrompt(),
    starter: `Research question: What is AgentChicago17B?

Draft brief JSON:
{"synthesis":{"title":"AgentChicago17B","executiveSummary":"An open-source desk research agent.","reframedQuestion":"What does it deliver?","narrative":"It scopes, gathers, and synthesizes.","keyFindings":["One brief"],"openQuestions":["Connectors?"],"recommendedNextSteps":["Run evals"],"confidence":"high"}}

Sources:
[1] Model prior knowledge

Return ONLY JSON with verdict PASS or NEEDS_WORK.`,
  },
]

function uid() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function AgentPlayground() {
  const [templateId, setTemplateId] = useState(SYSTEM_TEMPLATES[0].id)
  const [system, setSystem] = useState(() => SYSTEM_TEMPLATES[0].system())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState(SYSTEM_TEMPLATES[0].starter ?? '')
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID)
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1400)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastMs, setLastMs] = useState<number | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)

  const selectedModel = useMemo(
    () => RESEARCH_MODELS.find((m) => m.id === modelId) ?? RESEARCH_MODELS[0],
    [modelId],
  )

  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, running])

  function applyTemplate(id: string) {
    const template = SYSTEM_TEMPLATES.find((t) => t.id === id) ?? SYSTEM_TEMPLATES[0]
    setTemplateId(template.id)
    setSystem(template.system())
    setDraft(template.starter ?? '')
    setMessages([])
    setError(null)
    setLastMs(null)
  }

  async function send() {
    const text = draft.trim()
    if (!text || running) return

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setDraft('')
    setRunning(true)
    setError(null)
    const started = performance.now()

    try {
      const response = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          temperature,
          max_tokens: maxTokens,
          messages: [
            ...(system.trim()
              ? [{ role: 'system', content: system.trim() }]
              : []),
            ...nextMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
        }),
      })

      const ms = Math.round(performance.now() - started)
      setLastMs(ms)

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: { content?: unknown; reasoning_content?: unknown }
        }>
        error?: string
      }

      if (!response.ok || payload.error) {
        setError(payload.error || `Request failed (${response.status})`)
        return
      }

      const content = extractMessageContent(payload.choices?.[0]?.message)
      if (!content) {
        setError('Model returned an empty response.')
        return
      }

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', content },
      ])
    } catch (err) {
      setLastMs(Math.round(performance.now() - started))
      setError(err instanceof Error ? err.message : 'Playground request failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="ad-shell ad-shell-studio">
      <header className="ad-top">
        <div>
          <h1 className="ad-title">Test models</h1>
          <p className="ad-sub">
            1) Pick a model → 2) Type a message → 3) Press Send
          </p>
        </div>
        <div className="ad-top-actions">
          <button
            type="button"
            className="ad-btn ad-btn-ghost"
            onClick={() => {
              setMessages([])
              setError(null)
              setLastMs(null)
            }}
          >
            Clear chat
          </button>
        </div>
      </header>

      <div className="ad-pg">
        <div className="ad-pg-body has-setup">
          <aside className="ad-pg-setup" aria-label="Instructions">
            <h2 className="ad-pg-panel-title">1 · Instructions</h2>

            <label className="ad-field">
              <span>Preset</span>
              <select
                className="ad-select"
                value={templateId}
                onChange={(event) => applyTemplate(event.target.value)}
              >
                {SYSTEM_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="ad-field ad-field-grow">
              <span>System message</span>
              <textarea
                className="ad-textarea"
                value={system}
                onChange={(event) => setSystem(event.target.value)}
                spellCheck={false}
                placeholder="How should the model behave?"
              />
            </label>
          </aside>

          <section className="ad-pg-session" aria-label="Chat">
            <div className="ad-pg-session-head">
              <h2 className="ad-pg-panel-title">2 · Chat</h2>
            </div>

            <div className="ad-pg-thread" ref={threadRef}>
              {messages.length === 0 && !running ? (
                <div className="ad-pg-empty">
                  <p className="ad-pg-empty-big">Your chat appears here</p>
                  <p className="ad-pg-empty-hint">Type in the box below, then press Send.</p>
                </div>
              ) : (
                <ul className="ad-chat">
                  {messages.map((message) => (
                    <li
                      key={message.id}
                      className={`ad-chat-msg ad-chat-${message.role}`}
                    >
                      <span className="ad-chat-role">
                        {message.role === 'user' ? 'You' : 'Model'}
                      </span>
                      <div className="ad-chat-bubble">{message.content}</div>
                    </li>
                  ))}
                  {running ? (
                    <li className="ad-chat-msg ad-chat-assistant ad-chat-pending">
                      <span className="ad-chat-role">Model</span>
                      <div className="ad-chat-bubble">Thinking…</div>
                    </li>
                  ) : null}
                </ul>
              )}
            </div>

            {error ? (
              <p className="ad-pg-error" role="alert">
                {error}
              </p>
            ) : null}

            <form
              className="ad-pg-composer"
              onSubmit={(event) => {
                event.preventDefault()
                void send()
              }}
            >
              <label className="sr-only" htmlFor="ad-user-input">
                Your message
              </label>
              <textarea
                id="ad-user-input"
                className="ad-textarea"
                value={draft}
                disabled={running}
                placeholder="Type your message here…"
                rows={3}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send()
                  }
                }}
              />
              <div className="ad-pg-composer-bar">
                <span className="ad-token">
                  {lastMs != null ? `Last reply: ${lastMs} ms` : 'Enter = Send'}
                </span>
                <button
                  type="submit"
                  className="ad-btn ad-btn-primary ad-btn-lg"
                  disabled={running || !draft.trim()}
                >
                  {running ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </section>

          <aside className="ad-pg-config" aria-label="Settings">
            <h2 className="ad-pg-panel-title">3 · Settings</h2>

            <label className="ad-field">
              <span>Model</span>
              <select
                className="ad-select"
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
              >
                {RESEARCH_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
              <span className="ad-hint">{selectedModel.blurb}</span>
            </label>

            <label className="ad-field">
              <span>
                Creativity <em>{temperature.toFixed(1)}</em>
              </span>
              <input
                className="ad-range"
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(event) => setTemperature(Number(event.target.value))}
              />
              <span className="ad-hint">Low = focused · High = creative</span>
            </label>

            <label className="ad-field">
              <span>Max length</span>
              <input
                className="ad-input"
                type="number"
                min={64}
                max={8000}
                step={64}
                value={maxTokens}
                onChange={(event) =>
                  setMaxTokens(Math.max(64, Number(event.target.value) || 64))
                }
              />
            </label>
          </aside>
        </div>
      </div>
    </div>
  )
}
