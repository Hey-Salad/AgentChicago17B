import { RESEARCH_STAGES, stageLabel, type ResearchStage } from '../agent'

interface PipelineProgressProps {
  stage: ResearchStage
  message: string
  progress: number
  running: boolean
}

export function PipelineProgress({
  stage,
  message,
  progress,
  running,
}: PipelineProgressProps) {
  const activeIndex = RESEARCH_STAGES.indexOf(
    stage as (typeof RESEARCH_STAGES)[number],
  )

  return (
    <section className="pipeline" aria-live="polite">
      <div className="pipeline-head">
        <h2>Desk research pipeline</h2>
        <p>
          {running
            ? message
            : stage === 'complete'
              ? 'Complete'
              : stage === 'error'
                ? message
                : 'Waiting for a question'}
        </p>
      </div>

      <ol className="stage-rail">
        {RESEARCH_STAGES.map((item, index) => {
          const done =
            stage === 'complete' || (activeIndex >= 0 && index < activeIndex)
          const current =
            (running || stage === 'error') && activeIndex === index

          return (
            <li
              key={item}
              className={[
                'stage-item',
                done ? 'is-done' : '',
                current ? 'is-current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="stage-index">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="stage-name">{stageLabel(item)}</span>
            </li>
          )
        })}
      </ol>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    </section>
  )
}
