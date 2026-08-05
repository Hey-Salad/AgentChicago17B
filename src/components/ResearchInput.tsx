import type { FormEvent } from 'react'

interface ResearchInputProps {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
  onSubmit: (query: string) => void
}

const SUGGESTIONS = [
  'What is AgentChicago17B and how does desk research work?',
  'How should a research agent synthesize findings into cards?',
  'Chicago as a desk-research environment: place, institutions, gaps',
]

export function ResearchInput({
  value,
  disabled,
  onChange,
  onSubmit,
}: ResearchInputProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(value)
  }

  return (
    <section className="input-panel">
      <form className="research-form" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="research-query">
          Research question
        </label>
        <div className="input-row">
          <textarea
            id="research-query"
            rows={3}
            value={value}
            disabled={disabled}
            placeholder="What should we research?"
            onChange={(event) => onChange(event.target.value)}
          />
          <button type="submit" className="primary-btn" disabled={disabled || !value.trim()}>
            {disabled ? 'Researching…' : 'Run desk research'}
          </button>
        </div>
      </form>

      <div className="suggestions">
        <span className="suggestions-label">Try</span>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="suggestion-chip"
            disabled={disabled}
            onClick={() => {
              onChange(suggestion)
              onSubmit(suggestion)
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  )
}
