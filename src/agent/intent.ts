import { getIntentSystemPrompt } from '../admin/skillStore'
import { extractMessageContent, parseJsonPayload } from './synthesisParse'

export interface ClarifyingQuestion {
  id: string
  prompt: string
  why?: string
}

export interface IntentAnalysis {
  ready: boolean
  rationale: string
  questions: ClarifyingQuestion[]
  /** Assumptions we’d make if the user skips questions. */
  assumptions: string[]
  mode: 'live' | 'heuristic'
}

export interface ClarificationAnswer {
  id: string
  prompt: string
  answer: string
}

export interface AnalyzeIntentOptions {
  model?: string
  forceDemo?: boolean
  forceLive?: boolean
  fetchImpl?: typeof fetch
}

function hasLlmConfig(): boolean {
  return Boolean(
    import.meta.env.VITE_LLM_API_KEY ||
      import.meta.env.VITE_CF_API_KEY ||
      import.meta.env.DEV,
  )
}

/** Curated “already clear enough” prompts used in demos / suggestions. */
const READY_PATTERNS = [
  /agentchicago/i,
  /how should desk research/i,
  /what is agentchicago/i,
  /one brief/i,
]

/**
 * Cheap offline / demo intent gate — asks only when the ask is clearly thin.
 */
export function heuristicIntent(query: string): IntentAnalysis {
  const trimmed = query.trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (READY_PATTERNS.some((re) => re.test(trimmed))) {
    return {
      ready: true,
      rationale: 'Question is specific enough to research.',
      questions: [],
      assumptions: [],
      mode: 'heuristic',
    }
  }

  const vagueOpener =
    /^(tell me about|what about|thoughts on|research|explain|info on|look into)\b/i.test(
      trimmed,
    )
  const thin = words.length > 0 && words.length < 7
  const noConstraint =
    !/\b(for|vs|versus|compared|between|in \d{4}|since|before|after|how|why|should|impact|cost)\b/i.test(
      trimmed,
    ) && words.length < 14

  if (vagueOpener || thin || noConstraint) {
    return {
      ready: false,
      rationale:
        'A couple of details will keep the brief focused on what you actually need.',
      questions: [
        {
          id: 'q-lens',
          prompt: 'What angle matters most — overview, decision, or comparison?',
          why: 'Sets the shape of the brief.',
        },
        {
          id: 'q-audience',
          prompt: 'Who is this brief for?',
          why: 'Tone and depth change for a founder vs a student vs a team.',
        },
        {
          id: 'q-depth',
          prompt: 'How deep should we go — quick scan or thorough pass?',
          why: 'Keeps us from over- or under-cooking.',
        },
      ].slice(0, thin || vagueOpener ? 3 : 2),
      assumptions: [
        'General educated reader',
        'Balanced overview unless told otherwise',
      ],
      mode: 'heuristic',
    }
  }

  return {
    ready: true,
    rationale: 'Enough detail to cook a focused brief.',
    questions: [],
    assumptions: [],
    mode: 'heuristic',
  }
}

function normalizeIntent(data: Record<string, unknown>, query: string): IntentAnalysis {
  const ready = Boolean(data.ready)
  const rawQuestions = Array.isArray(data.questions) ? data.questions : []
  const questions: ClarifyingQuestion[] = rawQuestions
    .slice(0, 3)
    .map((item, index) => {
      const row = (item && typeof item === 'object' ? item : {}) as Record<
        string,
        unknown
      >
      return {
        id: String(row.id || `q${index + 1}`),
        prompt: String(row.prompt || row.question || '').trim(),
        why: row.why ? String(row.why) : undefined,
      }
    })
    .filter((q) => q.prompt.length > 0)

  const assumptions = Array.isArray(data.assumptions)
    ? data.assumptions.map((a) => String(a)).filter(Boolean).slice(0, 4)
    : []

  if (ready || questions.length === 0) {
    return {
      ready: true,
      rationale: String(data.rationale || 'Ready to research.'),
      questions: [],
      assumptions,
      mode: 'live',
    }
  }

  return {
    ready: false,
    rationale: String(
      data.rationale ||
        `Need a bit more detail before researching “${query.trim()}”.`,
    ),
    questions,
    assumptions,
    mode: 'live',
  }
}

async function liveIntent(
  query: string,
  options?: AnalyzeIntentOptions,
): Promise<IntentAnalysis> {
  const model =
    options?.model ||
    (import.meta.env.VITE_LLM_MODEL as string) ||
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
  const fetchFn = options?.fetchImpl ?? fetch
  const system = getIntentSystemPrompt()

  const response = await fetchFn('/api/llm/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 700,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `User research request:\n${query.trim()}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Intent analysis failed (${response.status})`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>
    error?: string
  }
  if (payload.error) throw new Error(payload.error)

  const content = extractMessageContent(payload.choices?.[0]?.message)
  if (!content) throw new Error('Intent analysis returned empty content')
  return normalizeIntent(parseJsonPayload(content), query)
}

/**
 * Decide whether to ask clarifying questions before desk research.
 * Falls back to the heuristic gate if live analysis fails.
 */
export async function analyzeIntent(
  query: string,
  options?: AnalyzeIntentOptions,
): Promise<IntentAnalysis> {
  const trimmed = query.trim()
  if (!trimmed) {
    throw new Error('Enter a research question to begin desk research.')
  }

  const live =
    Boolean(options?.forceLive) ||
    (!options?.forceDemo && hasLlmConfig())

  if (!live) {
    return heuristicIntent(trimmed)
  }

  try {
    return await liveIntent(trimmed, options)
  } catch {
    return heuristicIntent(trimmed)
  }
}

/** Fold Q&A into a single research brief for the pipeline. */
export function formatClarifiedQuery(
  original: string,
  answers: ClarificationAnswer[],
): string {
  const filled = answers.filter((a) => a.answer.trim())
  if (filled.length === 0) return original.trim()

  const block = filled
    .map((a) => `- ${a.prompt}\n  Answer: ${a.answer.trim()}`)
    .join('\n')

  return `${original.trim()}

Clarifications from the user:
${block}`
}
