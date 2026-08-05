/** User-controlled source policy for classic Gather (persisted locally). */

export interface SourcePolicy {
  /** Use Tavily when a key is configured. */
  useWebSearch: boolean
  /** Extra URLs always included as sources (one per line in UI). */
  seedUrls: string[]
  /** Prefer / keep Tavily hits whose host matches (empty = no filter). */
  trustedDomains: string[]
}

const STORAGE_KEY = 'agentchicago-source-policy'

const DEFAULT_POLICY: SourcePolicy = {
  useWebSearch: true,
  seedUrls: [],
  trustedDomains: [],
}

export function defaultSourcePolicy(): SourcePolicy {
  return { ...DEFAULT_POLICY, seedUrls: [], trustedDomains: [] }
}

export function readSourcePolicy(): SourcePolicy {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSourcePolicy()
    const parsed = JSON.parse(raw) as Partial<SourcePolicy>
    return {
      useWebSearch: parsed.useWebSearch !== false,
      seedUrls: Array.isArray(parsed.seedUrls)
        ? parsed.seedUrls.filter((u) => typeof u === 'string' && u.trim())
        : [],
      trustedDomains: Array.isArray(parsed.trustedDomains)
        ? parsed.trustedDomains
            .filter((d) => typeof d === 'string')
            .map((d) => normalizeDomain(d))
            .filter(Boolean)
        : [],
    }
  } catch {
    return defaultSourcePolicy()
  }
}

export function writeSourcePolicy(policy: SourcePolicy): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(policy))
  } catch {
    /* ignore */
  }
}

export function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, '')
  return trimmed.replace(/^www\./, '').split('/')[0] ?? ''
}

export function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}
