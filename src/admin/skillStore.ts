/**
 * Admin-managed Double Diamond agent-skill prompts + local operator roster.
 * Persists in localStorage until real auth / backend arrives.
 */

export type SkillId =
  | 'intent'
  | 'discover'
  | 'define'
  | 'develop'
  | 'gather'
  | 'extract'
  | 'deliver'
  | 'critique'

export interface SkillNode {
  id: SkillId
  label: string
  diamond: 'problem' | 'solution' | 'quality'
  stageHint: string
  description: string
  prompt: string
}

export type OperatorRole = 'admin' | 'operator' | 'viewer'

export interface Operator {
  id: string
  name: string
  email: string
  role: OperatorRole
  active: boolean
}

const PROMPTS_KEY = 'agentchicago-skill-prompts-v1'
const USERS_KEY = 'agentchicago-operators-v1'

export const DEFAULT_SKILLS: SkillNode[] = [
  {
    id: 'intent',
    label: 'Intent',
    diamond: 'problem',
    stageHint: 'scope',
    description: 'Gate: clarify ambiguous asks before research runs.',
    prompt: `You are the Intent agent for AgentChicago17B.
Decide if the user's research request is specific enough to produce a useful desk-research brief.

Return ONLY valid JSON (no markdown fences):
{
  "ready": boolean,
  "rationale": string,
  "questions": [{ "id": string, "prompt": string, "why": string }],
  "assumptions": string[]
}

Rules:
- If the ask already has a clear subject, lens, and enough constraints → ready=true and questions=[].
- If ambiguous, ask 1–3 plain-English clarifying questions (never more than 3).
- Questions must be short, non-technical, and answerable in one sentence.
- Prefer questions about lens (overview / decision / comparison), audience, timeframe, geography, or depth.
- Do not start researching. Do not invent sources.
- assumptions: what you would assume if the user skipped clarification.`,
  },
  {
    id: 'discover',
    label: 'Discover',
    diamond: 'problem',
    stageHint: 'scope',
    description: 'Diverge on context, stakeholders, and adjacent questions.',
    prompt: `You are the Discover agent for AgentChicago17B.
Expand the user's research question into context: stakeholders, constraints, adjacent questions, and what "good" would look like.
Do not invent citations. Stay desk-research oriented.`,
  },
  {
    id: 'define',
    label: 'Define',
    diamond: 'problem',
    stageHint: 'plan',
    description: 'Converge on a reframed challenge and success criteria.',
    prompt: `You are the Define agent for AgentChicago17B.
Reframe the research question into one clear challenge with boundaries and success criteria.
Prefer precision over breadth.`,
  },
  {
    id: 'develop',
    label: 'Develop',
    diamond: 'solution',
    stageHint: 'plan',
    description: 'Fan out research angles before gathering.',
    prompt: `You are the Develop agent for AgentChicago17B.
Propose 3–5 research angles that together cover the defined challenge.
Each angle should be searchable and distinct.`,
  },
  {
    id: 'gather',
    label: 'Gather',
    diamond: 'solution',
    stageHint: 'gather',
    description: 'Collect secondary sources from configured tools.',
    prompt: `You are the Gather agent for AgentChicago17B.
Collect secondary sources relevant to the challenge. Prefer trusted / allowlisted sources when configured.
Never invent URLs.`,
  },
  {
    id: 'extract',
    label: 'Extract',
    diamond: 'solution',
    stageHint: 'extract',
    description: 'Pull claims, evidence, and gaps from sources.',
    prompt: `You are the Extract agent for AgentChicago17B.
From the gathered sources, extract claims, supporting evidence, conflicts, and open gaps.
Tag confidence honestly.`,
  },
  {
    id: 'deliver',
    label: 'Deliver',
    diamond: 'solution',
    stageHint: 'synthesize',
    description: 'Synthesize one commercial-grade research brief.',
    prompt: `You are AgentChicago17B, an open-source desk research agent (Deliver skill).
Return ONE synthesized research brief as ONLY valid JSON (no markdown fences, no commentary):
{
  "scope": {
    "question": string,
    "reframed": string,
    "boundaries": string[],
    "successCriteria": string[]
  },
  "angles": [{ "id": string, "label": string, "query": string }],
  "synthesis": {
    "title": string,
    "executiveSummary": string,
    "reframedQuestion": string,
    "narrative": string,
    "keyFindings": string[],
    "openQuestions": string[],
    "recommendedNextSteps": string[],
    "confidence": "high" | "medium" | "low"
  }
}
Rules:
- Prefer one coherent narrative over fragmented cards.
- executiveSummary: 2-3 sentences max.
- narrative: 1-3 short paragraphs that connect findings.
- keyFindings: 3-5 concise bullets.
- openQuestions and recommendedNextSteps: 2-4 bullets each.
- Be specific to the research question.
- Commercial-grade clarity: decisive, evidenced, honest about gaps.
- Cite with Chicago Manual of Style, 17th ed. (notes-bibliography): put [1], [2], … after claims in narrative and keyFindings, matching the numbered source list. Never invent sources or URLs.`,
  },
  {
    id: 'critique',
    label: 'Critique',
    diamond: 'quality',
    stageHint: 'synthesize',
    description: 'Checklist pass: evidence, bias, gaps before final brief.',
    prompt: `You are the Critique (QA) agent for AgentChicago17B.
You did NOT write the brief. Audit it independently.

Return ONLY valid JSON (no markdown fences):
{
  "verdict": "PASS" | "NEEDS_WORK",
  "findings": string[],
  "revisionNotes": string
}

Checklist:
- Claims with [n] notes must map to real provided sources; flag invented URLs.
- Executive summary and narrative answer the research question (no topic drift).
- Confidence matches evidence strength.
- Gaps and next steps are honest and useful.
- Tone is clear for a non-technical reader.

Rules:
- PASS if the brief is decision-ready with only minor nits.
- NEEDS_WORK only for material issues; revisionNotes must tell Deliver exactly what to fix (bullet list).
- findings: 1–5 short bullets.
- Never invent sources yourself.`,
  },
]

export const DEFAULT_OPERATORS: Operator[] = [
  {
    id: 'op-1',
    name: 'HeySalad Admin',
    email: 'admin@heysalad.local',
    role: 'admin',
    active: true,
  },
  {
    id: 'op-2',
    name: 'Research Operator',
    email: 'research@heysalad.local',
    role: 'operator',
    active: true,
  },
]

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadSkills(): SkillNode[] {
  const saved = readJson<Partial<Record<SkillId, string>> | null>(PROMPTS_KEY, null)
  if (!saved) return DEFAULT_SKILLS.map((s) => ({ ...s }))
  return DEFAULT_SKILLS.map((skill) => ({
    ...skill,
    prompt: saved[skill.id]?.trim() ? saved[skill.id]! : skill.prompt,
  }))
}

export function saveSkillPrompt(id: SkillId, prompt: string) {
  const current = readJson<Partial<Record<SkillId, string>>>(PROMPTS_KEY, {})
  current[id] = prompt
  writeJson(PROMPTS_KEY, current)
}

export function resetSkillPrompts() {
  try {
    localStorage.removeItem(PROMPTS_KEY)
  } catch {
    /* ignore */
  }
}

function skillPrompt(id: SkillId): string {
  return (
    loadSkills().find((s) => s.id === id)?.prompt ??
    DEFAULT_SKILLS.find((s) => s.id === id)!.prompt
  )
}

export function getIntentSystemPrompt(): string {
  return skillPrompt('intent')
}

export function getCritiqueSystemPrompt(): string {
  return `${skillPrompt('critique')}

You are a separate QA pass. Be strict but fair. Prefer PASS when issues are cosmetic.`
}

export function getDeliverSystemPrompt(sourceRules: string): string {
  const deliver = skillPrompt('deliver')
  return `${deliver}

Citation style — Chicago Manual of Style, 17th edition (notes-bibliography):
- Support claims in narrative and keyFindings with bracketed note numbers: [1], [2], …
- Numbers must match the source list order provided in the user message.
- Put the note immediately after the supported claim (before the period when natural).
- Do not invent sources, authors, or URLs. Skip a note rather than fabricate one.
- Do not emit a separate bibliography in the JSON; the app formats Bibliography from sources.

Source rules:
${sourceRules}`
}

export function loadOperators(): Operator[] {
  return readJson<Operator[]>(USERS_KEY, DEFAULT_OPERATORS.map((o) => ({ ...o })))
}

export function saveOperators(operators: Operator[]) {
  writeJson(USERS_KEY, operators)
}

export function resetOperators() {
  try {
    localStorage.removeItem(USERS_KEY)
  } catch {
    /* ignore */
  }
}
