export type {
  BriefQa,
  Confidence,
  PipelineProgress,
  ProgressCallback,
  ResearchAngle,
  ResearchBrief,
  ResearchScope,
  ResearchStage,
  ResearchSynthesis,
  Source,
} from './types'

export { RESEARCH_STAGES } from './types'
export { runDeskResearch, stageLabel } from './pipeline'
export type { DeskResearchOptions } from './pipeline'
export { buildDemoBrief } from './demo'
export {
  formatChicagoBibliographyEntry,
  formatChicagoDate,
  splitCiteMarkers,
} from './chicagoCite'
export {
  analyzeIntent,
  formatClarifiedQuery,
  heuristicIntent,
} from './intent'
export type {
  AnalyzeIntentOptions,
  ClarificationAnswer,
  ClarifyingQuestion,
  IntentAnalysis,
} from './intent'
export { critiqueBrief } from './critique'
export type { CritiqueResult, CritiqueVerdict, QaMeta } from './critique'
export {
  DOUBLE_DIAMOND,
  assertBriefIntegrity,
  assertProgressWalk,
  assertSynthesisIntegrity,
  diamondForStage,
  expectedStageSequence,
} from './doubleDiamond'
export {
  extractMessageContent,
  normalizeSynthesis,
  parseJsonPayload,
  synthesisFromLlmContent,
} from './synthesisParse'
export {
  DEFAULT_MODEL_ID,
  RESEARCH_MODELS,
  modelLabel,
  modelProvider,
  type ModelOption,
  type ModelProvider,
} from './models'
