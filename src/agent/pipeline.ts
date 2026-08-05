import { getDeliverSystemPrompt } from '../admin/skillStore'
import { critiqueBrief, type QaMeta } from './critique'
import { buildDemoBrief } from './demo'
import {
  extractMessageContent,
  normalizeSynthesis,
  parseJsonPayload,
  type LlmSynthesis,
} from './synthesisParse'
import type {
  ProgressCallback,
  ResearchBrief,
  ResearchStage,
  Source,
} from './types'
import { RESEARCH_STAGES } from './types'

const STAGE_COPY: Record<(typeof RESEARCH_STAGES)[number], string> = {
  scope: 'Understanding your question…',
  plan: 'Planning the research…',
  gather: 'Gathering good sources…',
  extract: 'Reading what matters…',
  synthesize: 'Cooking one clear brief…',
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hasLlmConfig(): boolean {
  // Proxy keeps secrets server-side; client only needs to know a provider exists.
  // In browser builds, presence of any configured key/env still signals live mode.
  return Boolean(
    import.meta.env.VITE_LLM_API_KEY ||
      import.meta.env.VITE_CF_API_KEY ||
      import.meta.env.DEV,
  )
}

export interface DeskResearchOptions {
  model?: string
  /** Skip live LLM/Tavily and use curated demo brief (tests / offline). */
  forceDemo?: boolean
  /** Force live path (tests). */
  forceLive?: boolean
  /** Override theatrical stage delay (ms). Use 0 in tests. */
  stageDelayMs?: number
  /**
   * Override Tavily key for this run.
   * Pass `null` to disable search even when env has a key.
   */
  tavilyApiKey?: string | null
  /** Inject fetch for regression tests. */
  fetchImpl?: typeof fetch
  /** Skip Critique QA pass (tests / speed). Default: run critique on live path. */
  skipCritique?: boolean
}

/**
 * Runs the AgentChicago17B desk research pipeline (double diamond).
 * Live calls go through /api/llm/chat to avoid browser CORS ("Failed to fetch").
 */
export async function runDeskResearch(
  query: string,
  onProgress?: ProgressCallback,
  options?: DeskResearchOptions,
): Promise<ResearchBrief> {
  const trimmed = query.trim()
  if (!trimmed) {
    throw new Error('Enter a research question to begin desk research.')
  }

  const live =
    Boolean(options?.forceLive) ||
    (!options?.forceDemo && hasLlmConfig())
  const total = RESEARCH_STAGES.length
  const delayMs = options?.stageDelayMs ?? (live ? 350 : 480)

  for (let i = 0; i < RESEARCH_STAGES.length; i++) {
    const stage = RESEARCH_STAGES[i]
    onProgress?.({
      stage,
      message: STAGE_COPY[stage],
      progress: Math.round(((i + 0.35) / total) * 100),
    })
    if (delayMs > 0) await sleep(delayMs)
    onProgress?.({
      stage,
      message: STAGE_COPY[stage],
      progress: Math.round(((i + 1) / total) * 100),
    })
  }

  if (live) {
    try {
      return await runLiveResearch(trimmed, onProgress, options)
    } catch (error) {
      const message = formatFetchError(error)
      onProgress?.({
        stage: 'error',
        message,
        progress: 100,
      })
      const demo = buildDemoBrief(trimmed)
      return {
        ...demo,
        mode: 'demo',
        stage: 'complete',
        stageMessage: `Live research failed (${message}). Showing demo synthesis.`,
        error: message,
      }
    }
  }

  const brief = buildDemoBrief(trimmed)
  onProgress?.({
    stage: 'complete',
    message: 'Your brief is ready',
    progress: 100,
  })
  return brief
}

function formatFetchError(error: unknown): string {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return 'Failed to reach the LLM proxy. Restart `npm run dev` and try again.'
  }
  return error instanceof Error ? error.message : 'Live research failed'
}

function resolveTavilyKey(options?: DeskResearchOptions): string | undefined {
  if (options && 'tavilyApiKey' in options) {
    return options.tavilyApiKey || undefined
  }
  const fromEnv = import.meta.env.VITE_TAVILY_API_KEY
  return typeof fromEnv === 'string' && fromEnv ? fromEnv : undefined
}

function resolveFetch(options?: DeskResearchOptions): typeof fetch {
  return options?.fetchImpl ?? fetch
}

async function runLiveResearch(
  query: string,
  onProgress?: ProgressCallback,
  options?: DeskResearchOptions,
): Promise<ResearchBrief> {
  const tavilyKey = resolveTavilyKey(options)
  const withSearch = Boolean(tavilyKey)
  const fetchFn = resolveFetch(options)

  onProgress?.({
    stage: 'gather',
    message: withSearch
      ? 'Looking up fresh sources…'
      : 'Working from what we know…',
    progress: 55,
  })

  const sources = withSearch
    ? await searchTavily(query, tavilyKey!, fetchFn)
    : knowledgePlaceholderSources(query)

  onProgress?.({
    stage: 'synthesize',
    message: 'Cooking one clear brief…',
    progress: 85,
  })

  let synthesis = await synthesizeWithLlm(
    query,
    sources,
    withSearch,
    options?.model,
    fetchFn,
  )

  let qa: QaMeta | undefined
  if (!options?.skipCritique) {
    onProgress?.({
      stage: 'critique',
      message: 'Quality check on the draft…',
      progress: 92,
    })

    const critique = await critiqueBrief({
      query,
      synthesis,
      sources,
      model: options?.model,
      fetchImpl: fetchFn,
    })

    let revised = false
    if (critique.verdict === 'NEEDS_WORK' && critique.revisionNotes) {
      onProgress?.({
        stage: 'synthesize',
        message: 'Improving the brief from QA notes…',
        progress: 96,
      })
      synthesis = await synthesizeWithLlm(
        query,
        sources,
        withSearch,
        options?.model,
        fetchFn,
        critique.revisionNotes,
      )
      revised = true
    }

    qa = {
      verdict: critique.verdict,
      findings: critique.findings,
      revised,
      skipped: critique.skipped,
    }
  }

  const stageMessage = withSearch
    ? 'Live desk research complete'
    : 'LLM synthesis complete (add Tavily for live sources)'

  onProgress?.({
    stage: 'complete',
    message: stageMessage,
    progress: 100,
  })

  return {
    id: `brief-${Date.now()}`,
    query,
    createdAt: new Date().toISOString(),
    stage: 'complete',
    stageMessage,
    mode: 'live',
    scope: synthesis.scope,
    angles: synthesis.angles,
    sources,
    synthesis: synthesis.synthesis,
    qa,
  }
}

function knowledgePlaceholderSources(query: string): Source[] {
  return [
    {
      id: 'knowledge-1',
      title: 'Model prior knowledge (no live web search)',
      publisher: 'AgentChicago17B',
      excerpt: `Live web search is not configured. Synthesis for “${query}” uses the connected LLM’s training knowledge only. Add VITE_TAVILY_API_KEY for real secondary sources.`,
    },
  ]
}

async function searchTavily(
  query: string,
  key: string,
  fetchFn: typeof fetch,
): Promise<Source[]> {
  const response = await fetchFn('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: 'advanced',
      max_results: 6,
      include_answer: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`Tavily search failed (${response.status})`)
  }

  const data = (await response.json()) as {
    results?: Array<{
      title?: string
      url?: string
      content?: string
      published_date?: string
    }>
  }

  return (data.results ?? []).map((result, index) => ({
    id: `live-s${index + 1}`,
    title: result.title ?? `Source ${index + 1}`,
    url: result.url,
    excerpt: result.content,
    publishedAt: result.published_date,
    publisher: result.url ? safeHost(result.url) : undefined,
  }))
}

function safeHost(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

async function synthesizeWithLlm(
  query: string,
  sources: Source[],
  hasLiveSources: boolean,
  modelOverride: string | undefined,
  fetchFn: typeof fetch,
  revisionNotes?: string,
): Promise<LlmSynthesis> {
  const model =
    modelOverride ||
    (import.meta.env.VITE_LLM_MODEL as string) ||
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

  const sourceBlock = sources
    .map(
      (s, i) =>
        `[${i + 1}] id=${s.id}\nTitle: ${s.title}\nPublisher: ${s.publisher ?? 'n/a'}\nDate: ${s.publishedAt ?? 'n/a'}\nURL: ${s.url ?? 'n/a'}\nExcerpt: ${s.excerpt ?? ''}`,
    )
    .join('\n\n')

  const sourceRules = hasLiveSources
    ? `- Use only the provided sources; never invent URLs.
- Cite them with Chicago 17th note numbers [1], [2], … matching this list.`
    : `- No live web sources are available. Synthesize carefully from established knowledge.
- Mark confidence medium/low where uncertain.
- Mention in openQuestions that live search (Tavily) is not configured.
- Do not invent URLs or fake note numbers for missing sources.`

  const system = getDeliverSystemPrompt(sourceRules)
  const revisionBlock = revisionNotes?.trim()
    ? `\n\nQA revision notes (address all of these):\n${revisionNotes.trim()}`
    : ''

  const wantsExtraBudget = /glm|gpt-oss|reasoning|kimi|nemotron/i.test(model)

  let response: Response
  try {
    response = await fetchFn('/api/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: wantsExtraBudget ? 2200 : 1400,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `Research question:\n${query}\n\nSources:\n${sourceBlock || '(none — knowledge-only pass)'}${revisionBlock}`,
          },
        ],
      }),
    })
  } catch (error) {
    throw new Error(formatFetchError(error))
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `LLM synthesis failed (${response.status})${detail ? `: ${detail.slice(0, 220)}` : ''}`,
    )
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: unknown
        reasoning_content?: unknown
      }
    }>
    error?: string
  }

  if (payload.error) {
    throw new Error(payload.error)
  }

  const message = payload.choices?.[0]?.message
  const content = extractMessageContent(message)
  if (!content) {
    throw new Error(
      'LLM returned an empty synthesis. Try Llama 3.3 70B Fast, or raise max tokens for reasoning models.',
    )
  }

  return normalizeSynthesis(parseJsonPayload(content), query)
}

export function stageLabel(stage: ResearchStage): string {
  switch (stage) {
    case 'clarify':
      return 'Clarify'
    case 'scope':
      return 'Scope'
    case 'plan':
      return 'Plan'
    case 'gather':
      return 'Gather'
    case 'extract':
      return 'Extract'
    case 'synthesize':
      return 'Synthesize'
    case 'critique':
      return 'QA'
    case 'complete':
      return 'Complete'
    case 'error':
      return 'Error'
    default:
      return 'Ready'
  }
}
