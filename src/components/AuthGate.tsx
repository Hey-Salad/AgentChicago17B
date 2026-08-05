import { useState, type FormEvent, type ReactNode } from 'react'
import {
  isAuthRequired,
  isUnlocked,
  lockSession,
  unlockDevBypass,
  unlockWithAccessCodeRemote,
  usesRemoteAccessCode,
} from '../auth/authSession'
import {
  authModeLabel,
  getOrCreateDeviceId,
  resolveAuthMode,
  type AuthMode,
} from '../auth/modes'
import { rememberAccessCode } from '../lib/apiClient'

interface AuthGateProps {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const mode = resolveAuthMode()
  const [authed, setAuthed] = useState(() => gateUnlocked(mode))
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (
    passesWithoutLocalGate(mode) ||
    (isAuthRequired() === false && mode !== 'access-code') ||
    authed
  ) {
    return (
      <>
        {children}
        {mode === 'access-code' && isAuthRequired() ? (
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

  if (mode === 'oauth') {
    return (
      <div className="auth-gate">
        <div className="auth-card">
          <p className="auth-brand">
            Agent<span className="auth-accent">Chicago</span>17B
          </p>
          <h1>OAuth sign-in</h1>
          <p className="auth-lede">
            Auth mode is <strong>oauth</strong>. The Worker adapter is stubbed in v1 — set{' '}
            <code>OAUTH_CLIENT_ID</code> / <code>OAUTH_CLIENT_SECRET</code> and complete the
            redirect flow, or switch to <code>access-code</code> / <code>anonymous</code> for now.
          </p>
          <p className="auth-lede">
            See <code>docs/auth-modes.md</code>.
          </p>
          {import.meta.env.DEV ? (
            <button
              type="button"
              className="auth-dev"
              onClick={() => {
                const result = unlockDevBypass()
                if (result.ok) setAuthed(true)
                else setError(result.error || 'Bypass failed')
              }}
            >
              Local only — continue without OAuth
            </button>
          ) : null}
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await unlockWithAccessCodeRemote(code)
      if (!result.ok) {
        setError(result.error || 'Could not unlock')
        return
      }
      rememberAccessCode(code)
      setAuthed(true)
    } finally {
      setBusy(false)
    }
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
        <p className="auth-byline">Open source by HeySalad · {authModeLabel(mode)}</p>
        <h1>Sign in to the research desk</h1>
        <p className="auth-lede">
          {usesRemoteAccessCode()
            ? 'Enter the shared access code for this cloud instance. The code is checked by your Worker — it is not stored in the page bundle.'
            : 'Enter the shared team code configured in .env, or put Cloudflare Access in front for production SSO.'}
        </p>

        <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
          <label htmlFor="access-code">Access code</label>
          <input
            id="access-code"
            type="password"
            autoComplete="current-password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Team access code"
            disabled={busy}
          />
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="auth-submit" disabled={busy || !code.trim()}>
            {busy ? 'Checking…' : 'Unlock desk'}
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

function passesWithoutLocalGate(mode: AuthMode): boolean {
  if (mode === 'cf-access') return true
  if (mode === 'anonymous') {
    getOrCreateDeviceId()
    return true
  }
  if (!isAuthRequired() && mode !== 'oauth') return true
  return false
}

function gateUnlocked(mode: AuthMode): boolean {
  if (passesWithoutLocalGate(mode)) return true
  return isUnlocked()
}
