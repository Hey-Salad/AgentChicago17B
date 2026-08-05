import { describe, expect, it } from './testHarness'
import {
  formatClarifiedQuery,
  heuristicIntent,
} from './intent'

describe('heuristicIntent', () => {
  it('marks AgentChicago demo prompts as ready', () => {
    const intent = heuristicIntent('What is AgentChicago17B?')
    expect(intent.ready).toBe(true)
    expect(intent.questions).toEqual([])
  })

  it('asks clarifying questions for thin vague prompts', () => {
    const intent = heuristicIntent('Tell me about Chicago')
    expect(intent.ready).toBe(false)
    expect(intent.questions.length).toBeGreaterThan(0)
    expect(intent.questions.length <= 3).toBe(true)
  })
})

describe('formatClarifiedQuery', () => {
  it('appends answered clarifications', () => {
    const text = formatClarifiedQuery('Chicago food history', [
      {
        id: 'q1',
        prompt: 'What angle matters most?',
        answer: 'Deep dish vs thin crust',
      },
      { id: 'q2', prompt: 'Who is this for?', answer: '' },
    ])
    expect(text).toContain('Chicago food history')
    expect(text).toContain('Deep dish vs thin crust')
    expect(text.includes('Who is this for?')).toBe(false)
  })
})
