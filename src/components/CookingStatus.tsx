import { useEffect, useMemo, useState } from 'react'
import type { ResearchStage } from '../agent'

const COOKING_VERBS = [
  'kneading',
  'proofing',
  'saucing',
  'deep-dishing',
  'oven-firing',
  'brief-baking',
  'simmering',
  'plating',
  'tasting',
]

const STAGE_FILL: Record<string, number> = {
  idle: 0.08,
  clarify: 0.12,
  scope: 0.22,
  plan: 0.38,
  gather: 0.55,
  extract: 0.72,
  synthesize: 0.88,
  critique: 0.94,
  complete: 1,
  error: 0.4,
}

interface CookingStatusProps {
  query: string
  stage: ResearchStage
  message: string
  modelLabel: string
}

export function CookingStatus({
  query,
  stage,
  message,
  modelLabel,
}: CookingStatusProps) {
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [verbIndex, setVerbIndex] = useState(0)

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    const rotate = window.setInterval(() => {
      setVerbIndex((i) => (i + 1) % COOKING_VERBS.length)
    }, 1600)
    return () => window.clearInterval(rotate)
  }, [])

  const elapsedSec = (now - startedAt) / 1000
  const fill = STAGE_FILL[stage] ?? 0.3
  // Presentational estimate — Claude-style meter, not provider billing truth
  const estTokens = useMemo(() => {
    const base = Math.max(48, Math.round(query.trim().split(/\s+/).length * 1.4))
    return base + Math.floor(elapsedSec * 18) + Math.floor(fill * 220)
  }, [query, elapsedSec, fill])

  const verb = COOKING_VERBS[verbIndex]

  return (
    <div className="cooking-status" aria-live="polite">
      <div className="cooking-pizza" style={{ ['--cook-fill' as string]: String(fill) }}>
        <img
          src="/brand/mark-color-clear.png"
          alt=""
          className="cooking-pizza-img"
          draggable={false}
        />
        <span className="cooking-pizza-sheen" aria-hidden="true" />
      </div>

      <div className="cooking-copy">
        <p className="cooking-query">{query}</p>
        <p className="cooking-verb">
          <span className="cooking-verb-word">{verb}</span>
          <span className="cooking-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </p>
        <p className="cooking-meta">
          <span>{formatElapsed(elapsedSec)}</span>
          <span className="cooking-sep" aria-hidden="true">
            ·
          </span>
          <span>{estTokens.toLocaleString()} tok</span>
          <span className="cooking-sep" aria-hidden="true">
            ·
          </span>
          <span>{modelLabel}</span>
        </p>
        <p className="cooking-stage">{message}</p>
      </div>
    </div>
  )
}

function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec.toFixed(1)}s`
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
