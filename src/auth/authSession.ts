const SESSION_KEY = 'agentchicago-auth-session-v1'

export interface AuthSession {
  unlockedAt: string
  method: 'access-code' | 'dev-bypass' | 'remote-access-code'
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
  // Remote Worker verification is always available in access-code mode.
  return true
}

export function usesRemoteAccessCode(): boolean {
  return !configuredCode()
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
      error: 'Use remote unlock for cloud deployments.',
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

/** Validate access code against the Worker (production / empty VITE_APP_ACCESS_CODE). */
export async function unlockWithAccessCodeRemote(
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = code.trim()
  if (!trimmed) {
    return { ok: false, error: 'Enter an access code.' }
  }

  const expected = configuredCode()
  if (expected) {
    return unlockWithAccessCode(trimmed)
  }

  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmed }),
    })
    const body = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean }
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error || 'That access code does not match.' }
    }
    const session: AuthSession = {
      unlockedAt: new Date().toISOString(),
      method: 'remote-access-code',
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: 'Could not reach the auth API. Is the Worker deployed?',
    }
  }
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
