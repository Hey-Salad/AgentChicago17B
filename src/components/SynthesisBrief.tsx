import type { ResearchBrief } from '../agent'
import { CitedText } from './CitedText'

interface SynthesisBriefProps {
  brief: ResearchBrief
}

export function SynthesisBrief({ brief }: SynthesisBriefProps) {
  const { synthesis } = brief
  const sourceCount = brief.sources.length

  return (
    <section className="synthesis-brief">
      <header className="synthesis-head">
        <div>
          <p className="synthesis-kicker">Synthesized brief</p>
          <h2>{synthesis.title}</h2>
        </div>
        <div className="brief-meta">
          <span className={`mode-pill mode-${brief.mode}`}>{brief.mode} mode</span>
          {synthesis.confidence ? (
            <span className={`confidence confidence-${synthesis.confidence}`}>
              {synthesis.confidence} confidence
            </span>
          ) : null}
          {brief.qa ? (
            <span
              className={`qa-pill qa-${brief.qa.verdict === 'PASS' ? 'pass' : 'revise'}${brief.qa.skipped ? ' qa-skipped' : ''}`}
              title={brief.qa.findings.join(' · ') || undefined}
            >
              {brief.qa.skipped
                ? 'QA skipped'
                : brief.qa.revised
                  ? 'QA revised'
                  : brief.qa.verdict === 'PASS'
                    ? 'QA passed'
                    : 'QA notes'}
            </span>
          ) : null}
          <time dateTime={brief.createdAt}>
            {new Date(brief.createdAt).toLocaleString()}
          </time>
        </div>
      </header>

      {brief.qa && brief.qa.findings.length > 0 && !brief.qa.skipped ? (
        <div className="qa-findings">
          <h3>Quality check</h3>
          <ul>
            {brief.qa.findings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="synthesis-summary">
        <h3>Executive summary</h3>
        <p>
          <CitedText text={synthesis.executiveSummary} sourceCount={sourceCount} />
        </p>
      </div>

      <div className="synthesis-reframe">
        <h3>Reframed question</h3>
        <p>{synthesis.reframedQuestion}</p>
      </div>

      <div className="synthesis-narrative">
        <h3>Synthesis</h3>
        {synthesis.narrative.split(/\n+/).map((paragraph, i) => (
          <p key={`${i}-${paragraph.slice(0, 32)}`}>
            <CitedText text={paragraph} sourceCount={sourceCount} />
          </p>
        ))}
      </div>

      <div className="synthesis-columns">
        <div>
          <h3>Key findings</h3>
          <ul>
            {synthesis.keyFindings.map((item) => (
              <li key={item}>
                <CitedText text={item} sourceCount={sourceCount} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Open questions</h3>
          <ul>
            {synthesis.openQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="synthesis-next">
        <h3>Recommended next steps</h3>
        <ol>
          {synthesis.recommendedNextSteps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}
