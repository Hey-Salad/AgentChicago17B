import { useState } from 'react'
import type { ClarifyingQuestion } from '../agent/intent'

interface ClarifyingQuestionsProps {
  originalQuery: string
  rationale: string
  questions: ClarifyingQuestion[]
  assumptions: string[]
  busy?: boolean
  onSubmit: (answers: Record<string, string>) => void
  onSkip: () => void
}

export function ClarifyingQuestions({
  originalQuery,
  rationale,
  questions,
  assumptions,
  busy,
  onSubmit,
  onSkip,
}: ClarifyingQuestionsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, ''])),
  )

  const hasAnyAnswer = Object.values(answers).some((v) => v.trim())

  return (
    <section className="clarify-panel" aria-labelledby="clarify-heading">
      <p className="clarify-kicker">Before we cook</p>
      <h2 id="clarify-heading">A couple of quick checks</h2>
      <p className="clarify-rationale">{rationale}</p>
      <p className="clarify-query">
        <span>You asked</span> {originalQuery}
      </p>

      <form
        className="clarify-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (busy) return
          onSubmit(answers)
        }}
      >
        <ol className="clarify-list">
          {questions.map((question) => (
            <li key={question.id}>
              <label htmlFor={`clarify-${question.id}`}>
                <span className="clarify-prompt">{question.prompt}</span>
                {question.why ? (
                  <span className="clarify-why">{question.why}</span>
                ) : null}
              </label>
              <input
                id={`clarify-${question.id}`}
                type="text"
                value={answers[question.id] ?? ''}
                disabled={busy}
                placeholder="Your answer…"
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [question.id]: event.target.value,
                  }))
                }
              />
            </li>
          ))}
        </ol>

        {assumptions.length > 0 ? (
          <p className="clarify-assumptions">
            If you skip, we’ll assume: {assumptions.join(' · ')}
          </p>
        ) : null}

        <div className="clarify-actions">
          <button type="submit" className="clarify-primary" disabled={busy}>
            {hasAnyAnswer ? 'Cook with these answers' : 'Continue'}
          </button>
          <button
            type="button"
            className="clarify-secondary"
            disabled={busy}
            onClick={onSkip}
          >
            Skip — just research it
          </button>
        </div>
      </form>
    </section>
  )
}
