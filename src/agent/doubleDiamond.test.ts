import {
  DOUBLE_DIAMOND,
  assertBriefIntegrity,
  assertProgressWalk,
  assertSynthesisIntegrity,
  diamondForStage,
  expectedStageSequence,
} from './doubleDiamond'
import { buildDemoBrief } from './demo'
import { describe, expect, it } from './testHarness'
import type { PipelineProgress, ResearchBrief } from './types'
import { RESEARCH_STAGES } from './types'

function tick(
  stage: PipelineProgress['stage'],
  progress: number,
  message = `${stage}…`,
): PipelineProgress {
  return { stage, message, progress }
}

describe('double diamond contract', () => {
  it('keeps problem then solution diamonds in fixed order', () => {
    expect(expectedStageSequence()).toEqual([
      'scope',
      'plan',
      'gather',
      'extract',
      'synthesize',
    ])
    expect(DOUBLE_DIAMOND.problem).toEqual(['scope', 'plan'])
    expect(DOUBLE_DIAMOND.solution).toEqual([
      'gather',
      'extract',
      'synthesize',
    ])
    expect([...DOUBLE_DIAMOND.problem, ...DOUBLE_DIAMOND.solution]).toEqual(
      RESEARCH_STAGES,
    )
  })

  it('maps each stage to the correct diamond', () => {
    expect(diamondForStage('scope')).toBe('problem')
    expect(diamondForStage('plan')).toBe('problem')
    expect(diamondForStage('gather')).toBe('solution')
    expect(diamondForStage('extract')).toBe('solution')
    expect(diamondForStage('synthesize')).toBe('solution')
  })
})

describe('assertProgressWalk — happy path', () => {
  it('accepts theatrical walk with repeats and complete', () => {
    const updates: PipelineProgress[] = []
    for (const stage of RESEARCH_STAGES) {
      updates.push(tick(stage, 10))
      updates.push(tick(stage, 20))
    }
    updates.push(tick('complete', 100, 'done'))
    expect(assertProgressWalk(updates)).toEqual({ ok: true })
  })

  it('allows live re-entry into gather/synthesize after the walk', () => {
    const updates: PipelineProgress[] = RESEARCH_STAGES.map((stage, i) =>
      tick(stage, (i + 1) * 20),
    )
    updates.push(tick('gather', 55, 'Calling Tavily…'))
    updates.push(tick('synthesize', 85, 'Asking model…'))
    updates.push(tick('complete', 100, 'Live complete'))
    expect(assertProgressWalk(updates)).toEqual({ ok: true })
  })
})

describe('assertProgressWalk — worst cases', () => {
  it('rejects empty progress', () => {
    expect(assertProgressWalk([])).toEqual({
      ok: false,
      reason: 'No progress updates emitted',
    })
  })

  it('rejects skipped stages (scope → gather)', () => {
    const updates = [tick('scope', 10), tick('gather', 40)]
    expect(assertProgressWalk(updates).ok).toBe(false)
  })

  it('rejects backwards walk (plan → scope)', () => {
    const updates = [tick('scope', 10), tick('plan', 20), tick('scope', 30)]
    expect(assertProgressWalk(updates).ok).toBe(false)
  })

  it('rejects complete before diamond finishes', () => {
    const updates = [tick('scope', 10), tick('complete', 100, 'done')]
    expect(assertProgressWalk(updates).ok).toBe(false)
  })

  it('rejects error before any stage', () => {
    expect(assertProgressWalk([tick('error', 100, 'boom')]).ok).toBe(false)
  })

  it('accepts error after stages have started', () => {
    const updates = [tick('scope', 10), tick('error', 100, 'proxy down')]
    expect(assertProgressWalk(updates)).toEqual({ ok: true })
  })

  it('rejects idle mid-pipeline', () => {
    const updates = [tick('scope', 10), tick('idle', 0, 'reset')]
    expect(assertProgressWalk(updates).ok).toBe(false)
  })

  it('rejects empty messages and out-of-range progress', () => {
    expect(
      assertProgressWalk([{ stage: 'scope', message: '   ', progress: 10 }]).ok,
    ).toBe(false)
    expect(
      assertProgressWalk([{ stage: 'scope', message: 'ok', progress: 101 }]).ok,
    ).toBe(false)
    expect(
      assertProgressWalk([{ stage: 'scope', message: 'ok', progress: -1 }]).ok,
    ).toBe(false)
  })

  it('rejects unexpected post-walk stages like plan', () => {
    const updates = RESEARCH_STAGES.map((stage, i) => tick(stage, (i + 1) * 18))
    updates.push(tick('plan', 90, 'oops'))
    expect(assertProgressWalk(updates).ok).toBe(false)
  })
})

describe('assertBriefIntegrity', () => {
  it('accepts demo briefs', () => {
    const brief = buildDemoBrief('What is desk research?')
    expect(assertBriefIntegrity(brief, { requireSources: true })).toEqual({
      ok: true,
    })
  })

  it('rejects missing synthesis fields', () => {
    const brief = buildDemoBrief('q')
    brief.synthesis.executiveSummary = ''
    expect(assertBriefIntegrity(brief).ok).toBe(false)
  })

  it('rejects invalid source URLs', () => {
    const brief = buildDemoBrief('q')
    brief.sources = [{ id: 's1', title: 'Bad', url: 'not a url' }]
    expect(assertBriefIntegrity(brief).ok).toBe(false)
  })

  it('rejects empty key findings', () => {
    expect(
      assertSynthesisIntegrity({
        title: 't',
        executiveSummary: 'e',
        reframedQuestion: 'r',
        narrative: 'n',
        keyFindings: [],
        openQuestions: [],
        recommendedNextSteps: [],
      }).ok,
    ).toBe(false)
  })

  it('rejects incomplete brief shells', () => {
    const bad = {
      id: '',
      query: '',
      createdAt: 'nope',
      stage: 'idle',
      stageMessage: '',
      angles: [],
      sources: [],
      synthesis: buildDemoBrief('x').synthesis,
      mode: 'demo',
    } as ResearchBrief
    expect(assertBriefIntegrity(bad).ok).toBe(false)
  })
})
