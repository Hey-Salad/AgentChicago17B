import { useEffect, useId, useRef, useState } from 'react'
import { RESEARCH_MODELS, type ModelOption } from '../agent'

interface ModelPickerProps {
  value: string
  disabled?: boolean
  onChange: (modelId: string) => void
}

export function ModelPicker({ value, disabled, onChange }: ModelPickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected =
    RESEARCH_MODELS.find((model) => model.id === value) ?? RESEARCH_MODELS[0]

  const cloudflare = RESEARCH_MODELS.filter((m) => m.provider === 'cloudflare')
  const openrouter = RESEARCH_MODELS.filter((m) => m.provider === 'openrouter')
  const nvidia = RESEARCH_MODELS.filter((m) => m.provider === 'nvidia')

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function choose(model: ModelOption) {
    onChange(model.id)
    setOpen(false)
  }

  return (
    <div className={`model-picker ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="model-picker-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="model-picker-label">{selected.label}</span>
        <IconChevron />
      </button>

      {open ? (
        <div className="model-picker-menu" role="listbox" id={listId} tabIndex={-1}>
          <p className="model-picker-group">Cloudflare Workers AI</p>
          {cloudflare.map((model) => (
            <ModelOptionRow
              key={model.id}
              model={model}
              active={model.id === value}
              onSelect={choose}
            />
          ))}
          <p className="model-picker-group">OpenRouter</p>
          {openrouter.map((model) => (
            <ModelOptionRow
              key={model.id}
              model={model}
              active={model.id === value}
              onSelect={choose}
            />
          ))}
          <p className="model-picker-group">NVIDIA Build</p>
          {nvidia.map((model) => (
            <ModelOptionRow
              key={model.id}
              model={model}
              active={model.id === value}
              onSelect={choose}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ModelOptionRow({
  model,
  active,
  onSelect,
}: {
  model: ModelOption
  active: boolean
  onSelect: (model: ModelOption) => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={`model-picker-option ${active ? 'is-active' : ''}`}
      onClick={() => onSelect(model)}
    >
      <span className="model-picker-option-label">
        {model.label}
        {model.freeTier ? (
          <span className="model-free-badge">Free</span>
        ) : (
          <span className="model-paid-badge">Paid</span>
        )}
      </span>
      <span className="model-picker-option-blurb">{model.blurb}</span>
    </button>
  )
}

function IconChevron() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
