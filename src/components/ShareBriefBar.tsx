import { useState } from 'react'
import type { ResearchBrief } from '../agent'
import {
  copyBriefMarkdown,
  downloadBriefHtml,
  downloadBriefMarkdown,
  shareBriefAsPdf,
  shareBriefByEmail,
} from '../lib/shareBrief'

interface ShareBriefBarProps {
  brief: ResearchBrief
}

export function ShareBriefBar({ brief }: ShareBriefBarProps) {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function flash(message: string) {
    setNote(message)
    window.setTimeout(() => setNote(null), 3200)
  }

  return (
    <div className={`share-bar ${open ? 'is-open' : ''}`}>
      <div className="share-bar-main">
        <p className="share-kicker">Share this brief</p>
        <div className="share-actions">
          <button
            type="button"
            className="share-btn share-primary"
            onClick={() => {
              const result = shareBriefAsPdf(brief)
              flash(
                result.ok
                  ? 'Print dialog opened — choose Save as PDF'
                  : 'Popup blocked — downloaded HTML instead',
              )
            }}
          >
            PDF
          </button>
          <button
            type="button"
            className="share-btn"
            onClick={() => {
              setOpen((v) => !v)
              setNote(null)
            }}
            aria-expanded={open}
          >
            Email
          </button>
          <button
            type="button"
            className="share-btn"
            onClick={() => {
              downloadBriefMarkdown(brief)
              flash('Markdown downloaded')
            }}
          >
            Markdown
          </button>
          <button
            type="button"
            className="share-btn"
            onClick={() => {
              downloadBriefHtml(brief)
              flash('HTML downloaded')
            }}
          >
            HTML
          </button>
          <button
            type="button"
            className="share-btn"
            onClick={() => {
              void copyBriefMarkdown(brief).then((ok) =>
                flash(ok ? 'Copied to clipboard' : 'Could not copy'),
              )
            }}
          >
            Copy
          </button>
        </div>
      </div>

      {open ? (
        <form
          className="share-email"
          onSubmit={(event) => {
            event.preventDefault()
            shareBriefByEmail(brief, email.trim())
            flash('Opening your email app…')
          }}
        >
          <label htmlFor="share-email-to">Send to</label>
          <div className="share-email-row">
            <input
              id="share-email-to"
              type="email"
              inputMode="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" className="share-btn share-primary">
              Open email
            </button>
          </div>
          <p className="share-hint">
            Opens your mail client with the brief in the body. For a full PDF, use{' '}
            <strong>PDF</strong> first, then attach the file.
          </p>
        </form>
      ) : null}

      {note ? (
        <p className="share-note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  )
}
