import { getCritiqueSystemPrompt } from '../admin/skillStore'
import type { LlmSynthesis } from './synthesisParse'
import { extractMessageContent, parseJsonPayload } from './synthesisParse'
import type { Source } from './types'

export type CritiqueVerdict = 'PASS' | 'NEEDS_WORK'

export interface CritiqueResult {
  verdict: CritiqueVerdict
  findings: string[]
  revisionNotes: string
  /** True when critique call failed and we soft-passed. */
  skipped?: boolean
}

export interface QaMeta {
  verdict: CritiqueVerdict
  findings: string[]
  revised: boolean
  skipped?: boolean
}

function chatCompletion(
  fetchFn: typeof fetch,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<Response> {
  return fetchFn('/api/llm/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
}

function normalizeCritique(data: Record<string, unknown>): CritiqueResult {
  const raw = String(data.verdict || data.status || 'PASS').toUpperCase()
  const verdict: CritiqueVerdict =
    raw.includes('NEED') || raw === 'FAIL' || raw === 'REVISE'
      ? 'NEEDS_WORK'
      : 'PASS'

  const findings = Array.isArray(data.findings)
    ? data.findings.map((f) => String(f)).filter(Boolean).slice(0, 6)
    : Array.isArray(data.issues)
      ? data.issues.map((f) => String(f)).filter(Boolean).slice(0, 6)
      : []

  const revisionNotes = String(
    data.revisionNotes || data.feedback || findings.join('\n') || '',
  ).trim()

  if (verdict === 'NEEDS_WORK' && !revisionNotes && findings.length === 0) {
    return {
      verdict: 'PASS',
      findings: ['Critique requested changes without details — accepting draft.'],
      revisionNotes: '',
    }
  }

  return { verdict, findings, revisionNotes }
}

/**
 * Separate QA agent — must not share the Deliver call.
 * Soft-passes on failure so research still ships.
 */
export async function critiqueBrief(options: {
  query: string
  synthesis: LlmSynthesis
  sources: Source[]
  model?: string
  fetchImpl?: typeof fetch
}): Promise<CritiqueResult> {
  const model =
    options.model ||
    (import.meta.env.VITE_LLM_MODEL as string) ||
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
  const fetchFn = options.fetchImpl ?? fetch
  const system = getCritiqueSystemPrompt()

  const sourceLines = options.sources
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}${s.url ? ` — ${s.url}` : ''}${s.excerpt ? `\n  ${s.excerpt.slice(0, 220)}` : ''}`,
    )
    .join('\n')

  const user = `Research question:
${options.query}

Draft brief JSON:
${JSON.stringify(options.synthesis, null, 2)}

Sources:
${sourceLines || '(none)'}

Return ONLY JSON with verdict PASS or NEEDS_WORK.`

  try {
    const response = await chatCompletion(fetchFn, model, system, user, 900)
    if (!response.ok) {
      return {
        verdict: 'PASS',
        findings: [`Critique skipped (HTTP ${response.status}).`],
        revisionNotes: '',
        skipped: true,
      }
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>
      error?: string
    }
    if (payload.error) {
      return {
        verdict: 'PASS',
        findings: [`Critique skipped: ${payload.error}`],
        revisionNotes: '',
        skipped: true,
      }
    }
    const content = extractMessageContent(payload.choices?.[0]?.message)
    if (!content) {
      return {
        verdict: 'PASS',
        findings: ['Critique returned empty — accepting draft.'],
        revisionNotes: '',
        skipped: true,
      }
    }
    return normalizeCritique(parseJsonPayload(content))
  } catch (error) {
    return {
      verdict: 'PASS',
      findings: [
        `Critique skipped: ${error instanceof Error ? error.message : 'unknown error'}`,
      ],
      revisionNotes: '',
      skipped: true,
    }
  }
}
