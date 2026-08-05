import type { ResearchScope, ResearchSynthesis } from './types'

export interface LlmSynthesis {
  scope: ResearchScope
  angles: Array<{ id: string; label: string; query: string }>
  synthesis: ResearchSynthesis
}

export function extractMessageContent(
  message:
    | {
        content?: unknown
        reasoning_content?: unknown
      }
    | undefined,
): string {
  if (!message) return ''
  const raw = message.content
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  if (raw && typeof raw === 'object') return JSON.stringify(raw)
  // Some reasoning models leave content empty while filling reasoning_content.
  const reasoning = message.reasoning_content
  if (typeof reasoning === 'string' && reasoning.includes('{')) {
    return reasoning.trim()
  }
  return ''
}

export function parseJsonPayload(content: string): Record<string, unknown> {
  const trimmed = content.trim()
  if (!trimmed) {
    throw new Error('LLM returned non-JSON synthesis')
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim()) as Record<string, unknown>
    }
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>
    }
    throw new Error('LLM returned non-JSON synthesis')
  }
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item)).filter(Boolean)
}

/**
 * Normalize messy / partial LLM JSON into a complete brief-shaped synthesis.
 * Worst-case inputs should still produce a usable converge step.
 */
export function normalizeSynthesis(
  data: Record<string, unknown>,
  query: string,
): LlmSynthesis {
  const synthesisRaw =
    (data.synthesis as Record<string, unknown> | undefined) ?? data
  const scopeRaw = (data.scope as Record<string, unknown> | undefined) ?? {}
  const angles = Array.isArray(data.angles) ? data.angles : []

  const synthesis: ResearchSynthesis = {
    title: String(synthesisRaw.title || `Desk brief: ${query}`),
    executiveSummary: String(
      synthesisRaw.executiveSummary ||
        synthesisRaw.summary ||
        data.synthesisSummary ||
        'No executive summary returned.',
    ),
    reframedQuestion: String(
      synthesisRaw.reframedQuestion || scopeRaw.reframed || query,
    ),
    narrative: String(
      synthesisRaw.narrative ||
        synthesisRaw.body ||
        synthesisRaw.executiveSummary ||
        '',
    ),
    keyFindings: asStringArray(
      synthesisRaw.keyFindings || synthesisRaw.findings || [],
    ),
    openQuestions: asStringArray(
      synthesisRaw.openQuestions || synthesisRaw.gaps || [],
    ),
    recommendedNextSteps: asStringArray(
      synthesisRaw.recommendedNextSteps || synthesisRaw.nextSteps || [],
    ),
    confidence:
      synthesisRaw.confidence === 'high' ||
      synthesisRaw.confidence === 'medium' ||
      synthesisRaw.confidence === 'low'
        ? synthesisRaw.confidence
        : 'medium',
  }

  if (!synthesis.narrative) {
    synthesis.narrative = synthesis.executiveSummary
  }
  if (synthesis.keyFindings.length === 0) {
    synthesis.keyFindings = [
      'The model returned a brief without discrete findings.',
    ]
  }

  return {
    scope: {
      question: String(scopeRaw.question || query),
      reframed: String(scopeRaw.reframed || synthesis.reframedQuestion),
      boundaries: asStringArray(scopeRaw.boundaries),
      successCriteria: asStringArray(scopeRaw.successCriteria),
    },
    angles: angles
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object',
      )
      .map((item, index) => ({
        id: String(item.id || `a${index + 1}`),
        label: String(item.label || `Angle ${index + 1}`),
        query: String(item.query || query),
      })),
    synthesis,
  }
}

/** Parse + normalize an LLM message into diamond-2 converge output. */
export function synthesisFromLlmContent(
  content: string,
  query: string,
): LlmSynthesis {
  return normalizeSynthesis(parseJsonPayload(content), query)
}
