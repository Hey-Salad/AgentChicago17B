const SESSION_KEY = 'agentchicago-auth-session-v1'

export interface AuthSession {
  unlockedAt: string
  method: 'access-code' | 'dev-bypass'
}

function configuredCode(): string {
  return (import.meta.env.VITE_APP_ACCESS_CODE || '').trim()
}

/** When false, the SPA skips the local access-code wall (e.g. Cloudflare Access in front). */
export function isAuthRequired(): boolean {
  const raw = (import.meta.env.VITE_AUTH_REQUIRED ?? 'true').toString().toLowerCase()
  return raw !== 'false' && raw !== '0' && raw !== 'off'
}

export function hasAccessCodeConfigured(): boolean {
  return configuredCode().length > 0
}

export function readAuthSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function isUnlocked(): boolean {
  if (!isAuthRequired()) return true
  return Boolean(readAuthSession())
}

export function unlockWithAccessCode(code: string): { ok: boolean; error?: string } {
  const expected = configuredCode()
  if (!expected) {
    return {
      ok: false,
      error: 'No access code is configured. Set VITE_APP_ACCESS_CODE in .env and restart.',
    }
  }
  if (code.trim() !== expected) {
    return { ok: false, error: 'That access code does not match.' }
  }
  const session: AuthSession = {
    unlockedAt: new Date().toISOString(),
    method: 'access-code',
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return { ok: true }
}

/** Local development only — never available in production builds. */
export function unlockDevBypass(): { ok: boolean; error?: string } {
  if (!import.meta.env.DEV) {
    return { ok: false, error: 'Dev bypass is only available in local development.' }
  }
  const session: AuthSession = {
    unlockedAt: new Date().toISOString(),
    method: 'dev-bypass',
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return { ok: true }
}

export function lockSession() {
  sessionStorage.removeItem(SESSION_KEY)
}
