import { assertSynthesisIntegrity } from './doubleDiamond'
import {
  extractMessageContent,
  normalizeSynthesis,
  parseJsonPayload,
  synthesisFromLlmContent,
} from './synthesisParse'
import { describe, expect, it } from './testHarness'

const QUERY = 'How should desk research become one brief?'

function validPayload() {
  return {
    scope: {
      question: QUERY,
      reframed: 'How do we converge desk research into one brief?',
      boundaries: ['Secondary research only'],
      successCriteria: ['One readable brief'],
    },
    angles: [{ id: 'a1', label: 'Definitions', query: 'desk research brief' }],
    synthesis: {
      title: 'One brief over many cards',
      executiveSummary: 'Desk research should converge into one brief.',
      reframedQuestion: 'How do we converge desk research into one brief?',
      narrative: 'Cards scatter claims. A brief connects them.',
      keyFindings: ['One narrative beats card walls', 'Gaps must stay explicit'],
      openQuestions: ['Which sources are mandatory?'],
      recommendedNextSteps: ['Add live search', 'Keep confidence visible'],
      confidence: 'medium',
    },
  }
}

describe('parseJsonPayload — worst cases', () => {
  it('parses clean JSON', () => {
    const data = parseJsonPayload(JSON.stringify(validPayload()))
    expect(data.synthesis).toBeTruthy()
  })

  it('parses markdown-fenced JSON', () => {
    const fenced = `Here you go:\n\`\`\`json\n${JSON.stringify(validPayload())}\n\`\`\`\n`
    expect(parseJsonPayload(fenced).angles).toHaveLength(1)
  })

  it('extracts JSON embedded in prose', () => {
    const noisy = `Sure.\n${JSON.stringify(validPayload())}\nHope that helps!`
    expect(parseJsonPayload(noisy).scope).toBeTruthy()
  })

  it('throws on empty / non-JSON content', () => {
    expect(() => parseJsonPayload('')).toThrow(/non-JSON/i)
    expect(() => parseJsonPayload('totally not json')).toThrow(/non-JSON/i)
  })
})

describe('extractMessageContent — worst cases', () => {
  it('returns empty for missing message', () => {
    expect(extractMessageContent(undefined)).toBe('')
  })

  it('prefers string content', () => {
    expect(extractMessageContent({ content: '  {"ok":true}  ' })).toBe(
      '{"ok":true}',
    )
  })

  it('stringifies object content', () => {
    expect(extractMessageContent({ content: { a: 1 } })).toBe('{"a":1}')
  })

  it('falls back to reasoning_content when content empty', () => {
    expect(
      extractMessageContent({
        content: '',
        reasoning_content: 'thinking… {"title":"x"}',
      }),
    ).toContain('{')
  })

  it('ignores reasoning without JSON object', () => {
    expect(
      extractMessageContent({
        content: '   ',
        reasoning_content: 'no object here',
      }),
    ).toBe('')
  })
})

describe('normalizeSynthesis — worst cases', () => {
  it('fills defaults when model returns almost nothing', () => {
    const result = normalizeSynthesis({}, QUERY)
    expect(assertSynthesisIntegrity(result.synthesis)).toEqual({ ok: true })
    expect(result.synthesis.title).toContain(QUERY)
    expect(result.synthesis.keyFindings.length).toBeGreaterThan(0)
    expect(result.synthesis.confidence).toBe('medium')
    expect(result.scope.question).toBe(QUERY)
  })

  it('accepts alias field names (summary/findings/gaps/nextSteps)', () => {
    const result = normalizeSynthesis(
      {
        summary: 'Alias summary',
        findings: ['A'],
        gaps: ['B'],
        nextSteps: ['C'],
        body: 'Alias narrative',
        confidence: 'high',
      },
      QUERY,
    )
    expect(result.synthesis.executiveSummary).toBe('Alias summary')
    expect(result.synthesis.narrative).toBe('Alias narrative')
    expect(result.synthesis.keyFindings).toEqual(['A'])
    expect(result.synthesis.openQuestions).toEqual(['B'])
    expect(result.synthesis.recommendedNextSteps).toEqual(['C'])
    expect(result.synthesis.confidence).toBe('high')
  })

  it('coerces invalid confidence and junk angles', () => {
    const result = normalizeSynthesis(
      {
        synthesis: {
          title: 't',
          executiveSummary: 'e',
          narrative: 'n',
          keyFindings: ['k'],
          confidence: 'super-high',
        },
        angles: [null, 'bad', { label: 'Only label' }],
      },
      QUERY,
    )
    expect(result.synthesis.confidence).toBe('medium')
    expect(result.angles).toHaveLength(1)
    expect(result.angles[0].id).toBe('a1')
    expect(result.angles[0].query).toBe(QUERY)
  })

  it('copies executiveSummary into narrative when narrative missing', () => {
    const result = normalizeSynthesis(
      {
        synthesis: {
          title: 't',
          executiveSummary: 'Only summary',
          keyFindings: ['k'],
        },
      },
      QUERY,
    )
    expect(result.synthesis.narrative).toBe('Only summary')
  })

  it('filters non-array openQuestions safely', () => {
    const result = normalizeSynthesis(
      {
        synthesis: {
          title: 't',
          executiveSummary: 'e',
          narrative: 'n',
          keyFindings: [1, false, { x: 1 }, 'ok'],
          openQuestions: 'not-an-array',
        },
      },
      QUERY,
    )
    expect(result.synthesis.keyFindings).toContain('ok')
    expect(result.synthesis.openQuestions).toEqual([])
  })
})

describe('synthesisFromLlmContent end-to-end', () => {
  it('produces integrity-passing synthesis from fenced payload', () => {
    const content = `\`\`\`json\n${JSON.stringify(validPayload())}\n\`\`\``
    const result = synthesisFromLlmContent(content, QUERY)
    expect(assertSynthesisIntegrity(result.synthesis)).toEqual({ ok: true })
    expect(result.angles[0].label).toBe('Definitions')
  })
})
