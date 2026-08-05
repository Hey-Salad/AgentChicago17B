import type {
  PipelineProgress,
  ResearchBrief,
  ResearchStage,
  ResearchSynthesis,
} from './types'
import { RESEARCH_STAGES } from './types'

/**
 * Double-diamond desk research workflow.
 *
 * Diamond 1 — problem space:
 *   scope  (diverge: boundaries / success criteria)
 *   plan   (converge: research angles)
 *
 * Diamond 2 — solution space:
 *   gather   (diverge: secondary sources)
 *   extract  (diverge: claims / evidence)
 *   synthesize (converge: one brief)
 */
export const DOUBLE_DIAMOND = {
  problem: ['scope', 'plan'] as const,
  solution: ['gather', 'extract', 'synthesize'] as const,
  stages: RESEARCH_STAGES,
} as const

export type DoubleDiamondStage = (typeof RESEARCH_STAGES)[number]

/** Stages that must appear, in order, before a successful brief. */
export function expectedStageSequence(): DoubleDiamondStage[] {
  return [...RESEARCH_STAGES]
}

export function isDoubleDiamondStage(
  stage: ResearchStage,
): stage is DoubleDiamondStage {
  return (RESEARCH_STAGES as ResearchStage[]).includes(stage)
}

/**
 * Validate that progress updates walk the double diamond without skipping
 * or going backwards through the theatrical stage walk.
 *
 * After the full walk completes once, live mode may re-enter gather/synthesize.
 */
export function assertProgressWalk(
  updates: PipelineProgress[],
): { ok: true } | { ok: false; reason: string } {
  if (updates.length === 0) {
    return { ok: false, reason: 'No progress updates emitted' }
  }

  const expected = expectedStageSequence()
  let walkIndex = -1
  let walkedComplete = false
  let sawRuntimeStage = false

  for (const update of updates) {
    if (typeof update.progress !== 'number' || Number.isNaN(update.progress)) {
      return { ok: false, reason: 'progress must be a number' }
    }
    if (update.progress < 0 || update.progress > 100) {
      return { ok: false, reason: `progress out of range: ${update.progress}` }
    }
    if (!update.message?.trim()) {
      return { ok: false, reason: `Empty message at stage ${update.stage}` }
    }

    if (update.stage === 'idle') {
      return { ok: false, reason: 'idle is not a runtime pipeline stage' }
    }

    if (update.stage === 'error') {
      if (!sawRuntimeStage) {
        return { ok: false, reason: 'Error before any double-diamond stage' }
      }
      return { ok: true }
    }

    if (update.stage === 'complete') {
      if (!walkedComplete) {
        return {
          ok: false,
          reason: 'complete before finishing double-diamond walk',
        }
      }
      continue
    }

    // Intent clarification may appear before the diamond walk starts.
    if (update.stage === 'clarify') {
      sawRuntimeStage = true
      continue
    }

    if (!isDoubleDiamondStage(update.stage) && update.stage !== 'critique') {
      return { ok: false, reason: `Unknown stage: ${update.stage}` }
    }

    if (update.stage === 'critique') {
      if (!walkedComplete) {
        return { ok: false, reason: 'critique before diamond walk finished' }
      }
      sawRuntimeStage = true
      continue
    }

    sawRuntimeStage = true
    const stageIndex = expected.indexOf(update.stage)

    if (!walkedComplete) {
      if (stageIndex < walkIndex) {
        return {
          ok: false,
          reason: `Stage went backwards: ${update.stage} after ${expected[walkIndex]}`,
        }
      }
      if (stageIndex > walkIndex + 1) {
        return {
          ok: false,
          reason: `Skipped stage(s): jumped to ${update.stage}`,
        }
      }
      walkIndex = stageIndex
      if (walkIndex === expected.length - 1) {
        walkedComplete = true
      }
      continue
    }

    // Post-walk live work may re-enter gather / synthesize (critique handled above).
    if (update.stage !== 'gather' && update.stage !== 'synthesize') {
      return {
        ok: false,
        reason: `Unexpected post-walk stage: ${update.stage}`,
      }
    }
  }

  if (!walkedComplete) {
    const missing = expected.filter(
      (stage, index) => index > walkIndex && !updates.some((u) => u.stage === stage),
    )
    return {
      ok: false,
      reason: `Incomplete diamond walk; missing: ${missing.join(', ') || 'unknown'}`,
    }
  }

  return { ok: true }
}

export interface BriefIntegrityOptions {
  /** When true, require a non-empty sources list. */
  requireSources?: boolean
}

/**
 * Structural invariants for a completed double-diamond brief.
 * Keeps the converge step from shipping an empty or incoherent brief.
 */
export function assertBriefIntegrity(
  brief: ResearchBrief,
  options: BriefIntegrityOptions = {},
): { ok: true } | { ok: false; reason: string } {
  if (!brief.query?.trim()) {
    return { ok: false, reason: 'Brief missing query' }
  }
  if (brief.stage !== 'complete' && brief.stage !== 'error') {
    return { ok: false, reason: `Unexpected terminal stage: ${brief.stage}` }
  }
  if (brief.mode !== 'demo' && brief.mode !== 'live') {
    return { ok: false, reason: `Invalid mode: ${String(brief.mode)}` }
  }
  if (!brief.id?.trim()) {
    return { ok: false, reason: 'Brief missing id' }
  }
  if (!brief.createdAt || Number.isNaN(Date.parse(brief.createdAt))) {
    return { ok: false, reason: 'Brief missing valid createdAt' }
  }

  const synthesisCheck = assertSynthesisIntegrity(brief.synthesis)
  if (!synthesisCheck.ok) return synthesisCheck

  if (!Array.isArray(brief.angles)) {
    return { ok: false, reason: 'angles must be an array' }
  }
  if (!Array.isArray(brief.sources)) {
    return { ok: false, reason: 'sources must be an array' }
  }
  if (options.requireSources && brief.sources.length === 0) {
    return { ok: false, reason: 'sources required but empty' }
  }

  for (const source of brief.sources) {
    if (!source.id?.trim() || !source.title?.trim()) {
      return { ok: false, reason: 'source missing id or title' }
    }
    if (source.url) {
      try {
        void new URL(source.url)
      } catch {
        return { ok: false, reason: `invalid source url: ${source.url}` }
      }
    }
  }

  if (brief.scope) {
    if (!brief.scope.question?.trim() || !brief.scope.reframed?.trim()) {
      return { ok: false, reason: 'scope missing question/reframed' }
    }
    if (
      !Array.isArray(brief.scope.boundaries) ||
      !Array.isArray(brief.scope.successCriteria)
    ) {
      return { ok: false, reason: 'scope arrays invalid' }
    }
  }

  return { ok: true }
}

export function assertSynthesisIntegrity(
  synthesis: ResearchSynthesis,
): { ok: true } | { ok: false; reason: string } {
  if (!synthesis.title?.trim()) {
    return { ok: false, reason: 'synthesis missing title' }
  }
  if (!synthesis.executiveSummary?.trim()) {
    return { ok: false, reason: 'synthesis missing executiveSummary' }
  }
  if (!synthesis.reframedQuestion?.trim()) {
    return { ok: false, reason: 'synthesis missing reframedQuestion' }
  }
  if (!synthesis.narrative?.trim()) {
    return { ok: false, reason: 'synthesis missing narrative' }
  }
  if (!Array.isArray(synthesis.keyFindings) || synthesis.keyFindings.length === 0) {
    return { ok: false, reason: 'synthesis needs at least one keyFinding' }
  }
  if (!Array.isArray(synthesis.openQuestions)) {
    return { ok: false, reason: 'openQuestions must be an array' }
  }
  if (!Array.isArray(synthesis.recommendedNextSteps)) {
    return { ok: false, reason: 'recommendedNextSteps must be an array' }
  }
  if (
    synthesis.confidence !== undefined &&
    synthesis.confidence !== 'high' &&
    synthesis.confidence !== 'medium' &&
    synthesis.confidence !== 'low'
  ) {
    return {
      ok: false,
      reason: `invalid confidence: ${String(synthesis.confidence)}`,
    }
  }
  return { ok: true }
}

/** Which diamond a stage belongs to. */
export function diamondForStage(
  stage: DoubleDiamondStage,
): 'problem' | 'solution' {
  if (stage === 'scope' || stage === 'plan') return 'problem'
  return 'solution'
}
