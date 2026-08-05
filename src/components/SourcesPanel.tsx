import { useEffect, useState } from 'react'
import { formatChicagoBibliographyEntry } from '../agent/chicagoCite'
import type { ResearchBrief, Source } from '../agent'
import {
  parseLines,
  readSourcePolicy,
  writeSourcePolicy,
  type SourcePolicy,
} from '../lib/sourcePolicy'

interface SourcesPanelProps {
  brief: ResearchBrief | null
  tavilyConfigured: boolean
  onPolicyChange?: (policy: SourcePolicy) => void
}

export function SourcesPanel({
  brief,
  tavilyConfigured,
  onPolicyChange,
}: SourcesPanelProps) {
  const [policy, setPolicy] = useState<SourcePolicy>(() => readSourcePolicy())
  const [seedText, setSeedText] = useState(() => readSourcePolicy().seedUrls.join('\n'))
  const [domainText, setDomainText] = useState(() =>
    readSourcePolicy().trustedDomains.join('\n'),
  )
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    onPolicyChange?.(policy)
  }, [policy, onPolicyChange])

  function persist(next: SourcePolicy) {
    setPolicy(next)
    writeSourcePolicy(next)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  function saveLists() {
    persist({
      ...policy,
      seedUrls: parseLines(seedText),
      trustedDomains: parseLines(domainText).map((d) =>
        d.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]!,
      ),
    })
  }

  const sources = brief?.sources ?? []

  return (
    <section className="panel-page sources-page" aria-labelledby="sources-heading">
      <header className="panel-page-head">
        <h1 id="sources-heading">Sources</h1>
        <p>
          Control what Gather uses on the classic path. Live bibliography from your
          current brief appears on the right while you research.
        </p>
      </header>

      <div className="sources-layout">
        <div className="sources-config">
          <label className="sources-toggle">
            <input
              type="checkbox"
              checked={policy.useWebSearch}
              onChange={(e) =>
                persist({ ...policy, useWebSearch: e.target.checked })
              }
            />
            <span>
              <strong>Web search (Tavily)</strong>
              <span className="sources-help">
                {tavilyConfigured
                  ? 'Key detected — search will run when this is on.'
                  : 'Add VITE_TAVILY_API_KEY to enable live search.'}
              </span>
            </span>
          </label>

          <label className="sources-field">
            <span>Seed URLs</span>
            <span className="sources-help">
              Always include these pages (one URL per line). Fetched when possible.
            </span>
            <textarea
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              onBlur={saveLists}
              rows={4}
              placeholder={'https://example.com/report\nhttps://…'}
            />
          </label>

          <label className="sources-field">
            <span>Trusted domains</span>
            <span className="sources-help">
              Prefer Tavily hits from these hosts (one per line). Empty = keep all.
            </span>
            <textarea
              value={domainText}
              onChange={(e) => setDomainText(e.target.value)}
              onBlur={saveLists}
              rows={3}
              placeholder={'who.int\nnature.com\nchicago.gov'}
            />
          </label>

          <div className="sources-actions">
            <button type="button" className="panel-btn" onClick={saveLists}>
              Save source policy
            </button>
            {saved ? (
              <span className="sources-saved" role="status">
                Saved
              </span>
            ) : null}
          </div>
        </div>

        <aside className="sources-live" aria-label="Live bibliography">
          <h2>Live from this brief</h2>
          {brief ? (
            <LiveSourceList sources={sources} query={brief.query} mode={brief.mode} />
          ) : (
            <p className="sources-empty">
              Run Deep research — sources from the cook land here as the brief finishes.
            </p>
          )}
        </aside>
      </div>
    </section>
  )
}

export function SourcesRail({ brief }: { brief: ResearchBrief | null }) {
  if (!brief) {
    return (
      <aside className="sources-rail" aria-label="Sources">
        <p className="sources-rail-label">Sources</p>
        <p className="sources-empty">Waiting for a brief…</p>
      </aside>
    )
  }

  return (
    <aside className="sources-rail" aria-label="Sources">
      <p className="sources-rail-label">Sources</p>
      <p className="sources-rail-meta">
        {brief.sources.length} · {brief.mode}
      </p>
      <LiveSourceList sources={brief.sources} query={brief.query} mode={brief.mode} compact />
    </aside>
  )
}

function LiveSourceList({
  sources,
  query,
  mode,
  compact,
}: {
  sources: Source[]
  query: string
  mode: string
  compact?: boolean
}) {
  if (sources.length === 0) {
    return <p className="sources-empty">No sources on this brief yet.</p>
  }

  return (
    <ol className={`live-source-list ${compact ? 'is-compact' : ''}`}>
      {sources.map((source, index) => {
        const n = index + 1
        const entry = formatChicagoBibliographyEntry(source)
        return (
          <li key={source.id}>
            <span className="live-source-n" aria-hidden="true">
              {String(n).padStart(2, '0')}
            </span>
            <div>
              <p className="live-source-title">
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {entry.title}
                  </a>
                ) : (
                  entry.title
                )}
              </p>
              {!compact && entry.publisher ? (
                <p className="live-source-meta">{entry.publisher}</p>
              ) : null}
              {!compact && source.excerpt ? (
                <p className="live-source-excerpt">{source.excerpt}</p>
              ) : null}
            </div>
          </li>
        )
      })}
      {!compact ? (
        <li className="live-source-foot">
          <span className="live-source-n" aria-hidden="true">
            ··
          </span>
          <p className="live-source-meta">
            For “{query.split('\n')[0]}” · {mode}
          </p>
        </li>
      ) : null}
    </ol>
  )
}
