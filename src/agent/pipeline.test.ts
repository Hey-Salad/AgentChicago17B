import {
  assertBriefIntegrity,
  assertProgressWalk,
} from './doubleDiamond'
import { runDeskResearch } from './pipeline'
import {
  describe,
  expect,
  expectRejects,
  it,
} from './testHarness'
import type { PipelineProgress } from './types'

const QUERY = 'What is AgentChicago17B?'

function validLiveJson() {
  return {
    scope: {
      question: QUERY,
      reframed: 'What does AgentChicago17B deliver?',
      boundaries: ['Desk research'],
      successCriteria: ['One brief'],
    },
    angles: [{ id: 'a1', label: 'Product', query: QUERY }],
    synthesis: {
      title: 'AgentChicago17B',
      executiveSummary: 'An open-source desk research agent.',
      reframedQuestion: 'What does AgentChicago17B deliver?',
      narrative: 'It scopes, gathers, and synthesizes into one brief.',
      keyFindings: ['Double diamond pipeline', 'One brief output'],
      openQuestions: ['Which connectors next?'],
      recommendedNextSteps: ['Keep regression tests green'],
      confidence: 'high',
    },
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function critiquePassJson() {
  return {
    verdict: 'PASS',
    findings: ['Brief is decision-ready.'],
    revisionNotes: '',
  }
}

function llmChatResponse(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  synthesisBody: unknown,
): Response {
  const url = String(input)
  if (!url.includes('/api/llm/chat')) {
    throw new Error(`Unexpected fetch: ${url}`)
  }
  const raw = typeof init?.body === 'string' ? init.body : ''
  if (raw.includes('Draft brief JSON') || raw.includes('verdict PASS or NEEDS_WORK')) {
    return jsonResponse({
      choices: [{ message: { content: JSON.stringify(critiquePassJson()) } }],
    })
  }
  const content =
    typeof synthesisBody === 'string'
      ? synthesisBody
      : JSON.stringify(synthesisBody)
  return jsonResponse({
    choices: [{ message: { content } }],
  })
}

describe('runDeskResearch — demo / offline diamond', () => {
  it('rejects empty and whitespace-only queries', async () => {
    await expectRejects(
      runDeskResearch('', undefined, { forceDemo: true, stageDelayMs: 0 }),
      /research question/i,
    )
    await expectRejects(
      runDeskResearch('   \n\t  ', undefined, {
        forceDemo: true,
        stageDelayMs: 0,
      }),
      /research question/i,
    )
  })

  it('walks every double-diamond stage then completes', async () => {
    const updates: PipelineProgress[] = []
    const brief = await runDeskResearch(QUERY, (u) => updates.push(u), {
      forceDemo: true,
      stageDelayMs: 0,
    })

    expect(assertProgressWalk(updates)).toEqual({ ok: true })
    expect(updates.map((u) => u.stage)).toContain('scope')
    expect(updates.map((u) => u.stage)).toContain('synthesize')
    expect(updates.at(-1)?.stage).toBe('complete')
    expect(assertBriefIntegrity(brief, { requireSources: true })).toEqual({
      ok: true,
    })
    expect(brief.mode).toBe('demo')
    expect(brief.query).toBe(QUERY)
  })

  it('handles unicode, emoji, and very long queries without breaking integrity', async () => {
    const long = `研究 ${'q'.repeat(4000)} 🔬 café naïve`
    const brief = await runDeskResearch(long, undefined, {
      forceDemo: true,
      stageDelayMs: 0,
    })
    expect(assertBriefIntegrity(brief)).toEqual({ ok: true })
    expect(brief.query).toBe(long.trim())
  })

  it('trims query whitespace for the stored brief', async () => {
    const brief = await runDeskResearch(`  ${QUERY}  `, undefined, {
      forceDemo: true,
      stageDelayMs: 0,
    })
    expect(brief.query).toBe(QUERY)
  })
})

describe('runDeskResearch — live path worst cases', () => {
  it('falls back to demo brief when LLM proxy fetch fails', async () => {
    const updates: PipelineProgress[] = []
    const brief = await runDeskResearch(QUERY, (u) => updates.push(u), {
      forceLive: true,
      stageDelayMs: 0,
      tavilyApiKey: null,
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch')
      },
    })

    expect(brief.mode).toBe('demo')
    expect(brief.error).toMatch(/LLM proxy|Failed to reach/i)
    expect(assertBriefIntegrity(brief)).toEqual({ ok: true })
    expect(updates.some((u) => u.stage === 'error')).toBe(true)
    expect(assertProgressWalk(updates)).toEqual({ ok: true })
  })

  it('falls back when LLM returns HTTP error', async () => {
    const brief = await runDeskResearch(QUERY, undefined, {
      forceLive: true,
      stageDelayMs: 0,
      tavilyApiKey: null,
      fetchImpl: async () => jsonResponse({ error: 'upstream down' }, 502),
    })
    expect(brief.mode).toBe('demo')
    expect(brief.error).toMatch(/502|upstream|LLM synthesis failed/i)
    expect(assertBriefIntegrity(brief)).toEqual({ ok: true })
  })

  it('falls back when LLM returns empty content', async () => {
    const brief = await runDeskResearch(QUERY, undefined, {
      forceLive: true,
      stageDelayMs: 0,
      tavilyApiKey: null,
      fetchImpl: async () =>
        jsonResponse({ choices: [{ message: { content: '' } }] }),
    })
    expect(brief.mode).toBe('demo')
    expect(brief.error).toMatch(/empty synthesis/i)
  })

  it('falls back when LLM returns non-JSON prose', async () => {
    const brief = await runDeskResearch(QUERY, undefined, {
      forceLive: true,
      stageDelayMs: 0,
      tavilyApiKey: null,
      fetchImpl: async () =>
        jsonResponse({
          choices: [{ message: { content: 'I refuse to output JSON.' } }],
        }),
    })
    expect(brief.mode).toBe('demo')
    expect(brief.error).toMatch(/non-JSON/i)
  })

  it('completes live diamond when proxy returns valid JSON', async () => {
    const updates: PipelineProgress[] = []
    const brief = await runDeskResearch(QUERY, (u) => updates.push(u), {
      forceLive: true,
      stageDelayMs: 0,
      tavilyApiKey: null,
      fetchImpl: async (input, init) => llmChatResponse(input, init, validLiveJson()),
    })

    expect(brief.mode).toBe('live')
    expect(brief.error).toBeUndefined()
    expect(brief.qa?.verdict).toBe('PASS')
    expect(assertBriefIntegrity(brief, { requireSources: true })).toEqual({
      ok: true,
    })
    expect(assertProgressWalk(updates)).toEqual({ ok: true })
    expect(updates.filter((u) => u.stage === 'gather').length).toBeGreaterThan(1)
    expect(updates.some((u) => u.stage === 'critique')).toBe(true)
    expect(updates.at(-1)?.stage).toBe('complete')
  })

  it('falls back when Tavily search fails', async () => {
    const brief = await runDeskResearch(QUERY, undefined, {
      forceLive: true,
      stageDelayMs: 0,
      tavilyApiKey: 'test-tavily-key',
      fetchImpl: async (input) => {
        const url = String(input)
        if (url.includes('tavily.com')) {
          return new Response('nope', { status: 429 })
        }
        throw new Error(`Unexpected fetch: ${url}`)
      },
    })
    expect(brief.mode).toBe('demo')
    expect(brief.error).toMatch(/Tavily/i)
    expect(assertBriefIntegrity(brief)).toEqual({ ok: true })
  })

  it('uses Tavily sources then synthesizes when both succeed', async () => {
    const brief = await runDeskResearch(QUERY, undefined, {
      forceLive: true,
      stageDelayMs: 0,
      tavilyApiKey: 'test-tavily-key',
      fetchImpl: async (input, init) => {
        const url = String(input)
        if (url.includes('tavily.com')) {
          return jsonResponse({
            results: [
              {
                title: 'Desk research guide',
                url: 'https://example.com/desk',
                content: 'Synthesize into one brief.',
              },
            ],
          })
        }
        return llmChatResponse(input, init, validLiveJson())
      },
    })
    expect(brief.mode).toBe('live')
    expect(brief.sources[0]?.url).toBe('https://example.com/desk')
    expect(brief.stageMessage).toMatch(/Live desk research complete/i)
    expect(assertBriefIntegrity(brief, { requireSources: true })).toEqual({
      ok: true,
    })
  })

  it('recovers from markdown-fenced live responses', async () => {
    const brief = await runDeskResearch(QUERY, undefined, {
      forceLive: true,
      stageDelayMs: 0,
      tavilyApiKey: null,
      fetchImpl: async (input, init) =>
        llmChatResponse(
          input,
          init,
          `\`\`\`json\n${JSON.stringify(validLiveJson())}\n\`\`\``,
        ),
    })
    expect(brief.mode).toBe('live')
    expect(brief.synthesis.title).toBe('AgentChicago17B')
  })

  it('rewrites once when Critique returns NEEDS_WORK', async () => {
    let deliverCalls = 0
    const brief = await runDeskResearch(QUERY, undefined, {
      forceLive: true,
      stageDelayMs: 0,
      tavilyApiKey: null,
      fetchImpl: async (input, init) => {
        const url = String(input)
        if (!url.includes('/api/llm/chat')) {
          throw new Error(`Unexpected fetch: ${url}`)
        }
        const raw = typeof init?.body === 'string' ? init.body : ''
        if (raw.includes('Draft brief JSON')) {
          return jsonResponse({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    verdict: 'NEEDS_WORK',
                    findings: ['Narrative drifts from the question.'],
                    revisionNotes: 'Tighten narrative to the reframed question.',
                  }),
                },
              },
            ],
          })
        }
        deliverCalls += 1
        const payload = validLiveJson()
        if (deliverCalls > 1) {
          payload.synthesis.title = 'AgentChicago17B (revised)'
        }
        return jsonResponse({
          choices: [{ message: { content: JSON.stringify(payload) } }],
        })
      },
    })

    expect(brief.mode).toBe('live')
    expect(brief.qa?.verdict).toBe('NEEDS_WORK')
    expect(brief.qa?.revised).toBe(true)
    expect(brief.synthesis.title).toBe('AgentChicago17B (revised)')
    expect(deliverCalls).toBe(2)
  })
})
