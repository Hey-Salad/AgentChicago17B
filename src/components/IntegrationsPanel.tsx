import { useEffect, useState } from 'react'
import {
  classicIntegrations,
  eveIntegration,
  type IntegrationCard,
  type IntegrationStatus,
} from '../lib/integrations'
import { RESEARCH_MODELS } from '../agent/models'

export function IntegrationsPanel() {
  const [cards, setCards] = useState<IntegrationCard[]>(() => classicIntegrations())
  const [checking, setChecking] = useState(true)

  async function refresh() {
    setChecking(true)
    const classic = classicIntegrations()
    const eve = await eveIntegration()
    setCards([...classic, eve])
    setChecking(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const freeModels = RESEARCH_MODELS.filter((m) => m.freeTier)

  return (
    <section className="panel-page integrations-page" aria-labelledby="integrations-heading">
      <header className="panel-page-head">
        <div>
          <h1 id="integrations-heading">Integrations</h1>
          <p>
            Live status for every path — classic LLM backends, search, voice, and Eve.
          </p>
        </div>
        <button
          type="button"
          className="panel-btn"
          onClick={() => void refresh()}
          disabled={checking}
        >
          {checking ? 'Checking…' : 'Refresh'}
        </button>
      </header>

      <ul className="integration-grid">
        {cards.map((card) => (
          <li key={card.id} className="integration-card" data-status={card.status}>
            <div className="integration-card-top">
              <StatusPill status={card.status} />
              <span className="integration-path">{card.path}</span>
            </div>
            <h2>{card.name}</h2>
            <p className="integration-role">{card.role}</p>
            <p className="integration-detail">{card.detail}</p>
            {card.freeNote ? (
              <p className="integration-free">{card.freeNote}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <section className="free-models" aria-labelledby="free-models-heading">
        <h2 id="free-models-heading">Models that work on free plans</h2>
        <p className="sources-help">
          Cloudflare Free: 10k Neurons/day. GLM 5.2 requires Workers Paid (as of Jul 28,
          2026). NVIDIA Build: prefer Llama 3.1 8B. Eve on Vercel uses AI Gateway
          credits, not CF Neurons.
        </p>
        <ul className="free-model-list">
          {freeModels.map((model) => (
            <li key={model.id}>
              <strong>{model.label}</strong>
              <span>{model.blurb}</span>
              <code>{model.id}</code>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}

function StatusPill({ status }: { status: IntegrationStatus }) {
  const label =
    status === 'ready'
      ? 'Ready'
      : status === 'demo'
        ? 'Dev fallback'
        : status === 'error'
          ? 'Down'
          : 'Not set'
  return <span className={`status-pill status-${status}`}>{label}</span>
}
