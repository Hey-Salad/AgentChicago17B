import { useState, type FormEvent, type ReactNode } from 'react'
import {
  hasAccessCodeConfigured,
  isAuthRequired,
  isUnlocked,
  lockSession,
  unlockDevBypass,
  unlockWithAccessCode,
} from '../auth/authSession'

interface AuthGateProps {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const [authed, setAuthed] = useState(() => isUnlocked())
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isAuthRequired() || authed) {
    return (
      <>
        {children}
        {isAuthRequired() ? (
          <button
            type="button"
            className="auth-lock-fab"
            onClick={() => {
              lockSession()
              setAuthed(false)
              setCode('')
            }}
            title="Lock workspace"
          >
            Lock
          </button>
        ) : null}
      </>
    )
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const result = unlockWithAccessCode(code)
    if (!result.ok) {
      setError(result.error || 'Could not unlock')
      return
    }
    setError(null)
    setAuthed(true)
  }

  function onDevBypass() {
    const result = unlockDevBypass()
    if (!result.ok) {
      setError(result.error || 'Bypass failed')
      return
    }
    setError(null)
    setAuthed(true)
  }

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <img
          className="auth-mark"
          src="/brand/mark-color-clear.png"
          width={72}
          height={72}
          alt=""
        />
        <p className="auth-brand">
          Agent<span className="auth-accent">Chicago</span>17B
        </p>
        <p className="auth-byline">Open source by HeySalad</p>
        <h1>Sign in to the research desk</h1>
        <p className="auth-lede">
          This workspace sits behind an access wall. Enter the shared team code, or put{' '}
          <strong>Cloudflare Access</strong> in front for production SSO.
        </p>

        {!hasAccessCodeConfigured() ? (
          <div className="auth-setup" role="status">
            <p>
              No <code>VITE_APP_ACCESS_CODE</code> is set yet. Add one to{' '}
              <code>.env</code>, restart <code>npm run dev</code>, then unlock here.
            </p>
            <p>
              See <code>docs/INSTALL.md</code> and <code>docs/auth-and-sharing.md</code>.
            </p>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={onSubmit}>
          <label htmlFor="access-code">Access code</label>
          <input
            id="access-code"
            type="password"
            autoComplete="current-password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Team access code"
            disabled={!hasAccessCodeConfigured()}
          />
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="auth-submit" disabled={!hasAccessCodeConfigured()}>
            Unlock desk
          </button>
        </form>

        {import.meta.env.DEV ? (
          <button type="button" className="auth-dev" onClick={onDevBypass}>
            Local only — continue without code
          </button>
        ) : null}
      </div>
    </div>
  )
}
