import type { ResearchBrief, ResearchSynthesis } from './types'

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

/** Curated demo briefs used when no live LLM keys are configured. */
export function buildDemoBrief(query: string): ResearchBrief {
  const normalized = query.trim().toLowerCase()
  const synthesis = pickSynthesis(normalized, query)

  return {
    id: id('brief'),
    query: query.trim(),
    createdAt: new Date().toISOString(),
    stage: 'complete',
    stageMessage: 'Your brief is ready',
    mode: 'demo',
    scope: {
      question: query.trim(),
      reframed: synthesis.reframedQuestion,
      boundaries: [
        'Secondary (desk) research only',
        'One synthesized brief, not a card stack',
        'Gaps and next steps included',
      ],
      successCriteria: [
        'A clear executive summary',
        'A connected narrative',
        'Actionable next steps',
      ],
    },
    angles: [
      {
        id: 'a1',
        label: 'Definitions & context',
        query: `${query} definition background`,
      },
      {
        id: 'a2',
        label: 'Evidence & trade-offs',
        query: `${query} evidence tradeoffs`,
      },
      {
        id: 'a3',
        label: 'Gaps & next moves',
        query: `${query} gaps next steps`,
      },
    ],
    sources: [
      {
        id: 's1',
        title: 'Desk research synthesis practice',
        publisher: 'Research Methods Notes',
        publishedAt: '2024-03-12T00:00:00.000Z',
        url: 'https://example.com/desk-research-synthesis',
        excerpt:
          'A single brief reduces fragmentation by binding findings, uncertainty, and recommendations into one narrative.',
      },
      {
        id: 's2',
        title: 'Open-source research agent patterns',
        publisher: 'Agent Architecture Digest',
        publishedAt: '2024-06-01T00:00:00.000Z',
        url: 'https://example.com/agent-patterns',
        excerpt:
          'Staged pipelines outperform one-shot prompts when the output must stay inspectable.',
      },
    ],
    synthesis,
  }
}

function pickSynthesis(normalized: string, original: string): ResearchSynthesis {
  if (
    normalized.includes('agentchicago') ||
    normalized.includes('desk research') ||
    normalized.includes('research agent') ||
    normalized.includes('card')
  ) {
    return {
      title: 'Desk research works best as one brief',
      executiveSummary:
        'AgentChicago17B should synthesize secondary research into a single decision-ready brief: what we know, how confident we are, what remains open, and what to do next.[1]',
      reframedQuestion:
        'How should an open-source desk research agent present findings so a reader can act without scanning a stack of disconnected cards?',
      narrative:
        'Scattered cards make each claim easy to glance at, but they hide relationships. Desk research is valuable when findings, context, gaps, and recommendations stay connected in one narrative.[1] AgentChicago17B therefore scopes the question, gathers secondary material, and compresses the pass into a brief with an executive summary, a short narrative, key findings, open questions, and next steps. Confidence stays explicit, and missing live search is treated as a first-class gap rather than silent certainty.[2]',
      keyFindings: [
        'One synthesized brief is easier to act on than many peer cards.[1]',
        'Staged desk research (scope → gather → synthesize) beats a single prompt.[2]',
        'Gaps and next steps belong in the same document as the findings.[1]',
      ],
      openQuestions: [
        'Which live sources should round two prioritize once Tavily is connected?',
        'Which model quality bar is good enough for production briefs?',
      ],
      recommendedNextSteps: [
        'Ask a specific research question.',
        'Read the brief top to bottom before drilling into sources.',
        'Use open questions as the agenda for the next research pass.',
      ],
      confidence: 'high',
    }
  }

  if (
    normalized.includes('chicago') ||
    normalized.includes('illinois') ||
    normalized.includes('midwest')
  ) {
    return {
      title: 'Chicago as desk-research terrain',
      executiveSummary:
        'Chicago is a dense secondary-research environment. Useful briefs combine place, institutions, and open questions instead of collapsing into one headline story.',
      reframedQuestion: `What should a careful desk pass conclude about “${original.trim()}”?`,
      narrative:
        'Chicago offers abundant secondary material: civic reporting, university research, industry notes, and a strong built-environment literature. A first desk pass should establish context, surface a few durable findings across place and institutions, and mark neighborhood-level or contested claims as follow-ups. The point is not completeness. It is a readable synthesis that makes uncertainty visible.',
      keyFindings: [
        'Place, institutions, and economics usually beat a single narrative.',
        'Public secondary sources are rich enough for a strong first pass.',
        'Local nuance and unpublished data often remain out of reach.',
      ],
      openQuestions: [
        'Which neighborhoods or institutions need a second, narrower pass?',
        'What recent local reporting would change the current synthesis?',
      ],
      recommendedNextSteps: [
        'Tighten the question around one Chicago lens: place, people, or systems.',
        'Add live search for recent reporting.',
        'Treat open questions as the brief for round two.',
      ],
      confidence: 'medium',
    }
  }

  return {
    title: `Desk brief: ${original.trim()}`,
    executiveSummary: `This demo pass reframes “${original.trim()}” into a single synthesized brief so the answer stays readable and inspectable.`,
    reframedQuestion: `What should a careful desk researcher conclude about “${original.trim()}” after one structured pass?`,
    narrative: `You asked about “${original.trim()}”. In demo mode, AgentChicago17B shows the full desk pipeline and returns one brief instead of a wall of cards: summary first, then a connected narrative, then findings, gaps, and next steps. Live mode replaces this template with model synthesis. Without Tavily, claims stay knowledge-based and confidence should stay conservative.`,
    keyFindings: [
      'A reframed question prevents answering the wrong thing.',
      'Synthesis should separate what is known from what is still open.',
      'Next steps should fall out of the gaps, not appear as generic advice.',
    ],
    openQuestions: [
      'What primary or recent sources would raise confidence?',
      'Which competing interpretations need a second angle?',
    ],
    recommendedNextSteps: [
      'Connect live search when available.',
      'Run a second pass focused only on the open questions.',
      'Keep the brief format; resist splitting into many cards.',
    ],
    confidence: 'low',
  }
}
