/** Desk research stages, in order. */
export type ResearchStage =
  | 'idle'
  | 'clarify'
  | 'scope'
  | 'plan'
  | 'gather'
  | 'extract'
  | 'synthesize'
  | 'critique'
  | 'complete'
  | 'error'

export const RESEARCH_STAGES: Exclude<
  ResearchStage,
  'idle' | 'clarify' | 'critique' | 'complete' | 'error'
>[] = ['scope', 'plan', 'gather', 'extract', 'synthesize']

export type Confidence = 'high' | 'medium' | 'low'

export interface Source {
  id: string
  title: string
  url?: string
  publisher?: string
  excerpt?: string
  publishedAt?: string
}

export interface ResearchAngle {
  id: string
  label: string
  query: string
}

export interface ResearchScope {
  question: string
  reframed: string
  boundaries: string[]
  successCriteria: string[]
}

/** One coherent desk-research brief instead of many cards. */
export interface ResearchSynthesis {
  title: string
  executiveSummary: string
  reframedQuestion: string
  narrative: string
  keyFindings: string[]
  openQuestions: string[]
  recommendedNextSteps: string[]
  confidence?: Confidence
}

export interface BriefQa {
  verdict: 'PASS' | 'NEEDS_WORK'
  findings: string[]
  revised: boolean
  skipped?: boolean
}

export interface ResearchBrief {
  id: string
  query: string
  createdAt: string
  stage: ResearchStage
  stageMessage: string
  scope?: ResearchScope
  angles: ResearchAngle[]
  sources: Source[]
  synthesis: ResearchSynthesis
  mode: 'demo' | 'live'
  /** Critique / QA pass metadata (live path). */
  qa?: BriefQa
  error?: string
}

export interface PipelineProgress {
  stage: ResearchStage
  message: string
  progress: number
}

export type ProgressCallback = (update: PipelineProgress) => void
