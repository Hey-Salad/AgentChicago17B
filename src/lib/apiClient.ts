import { getOrCreateDeviceId, resolveAuthMode } from '../auth/modes'
import { readAuthSession } from '../auth/authSession'

const ACCESS_CODE_STORAGE = 'agentchicago-access-code-v1'

export function rememberAccessCode(code: string) {
  try {
    sessionStorage.setItem(ACCESS_CODE_STORAGE, code.trim())
  } catch {
    /* ignore */
  }
}

export function readRememberedAccessCode(): string {
  try {
    return sessionStorage.getItem(ACCESS_CODE_STORAGE) || ''
  } catch {
    return ''
  }
}

/** Headers the Worker auth adapters expect. */
export function apiAuthHeaders(): HeadersInit {
  const mode = resolveAuthMode()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (mode === 'access-code') {
    const code =
      readRememberedAccessCode() ||
      (import.meta.env.VITE_APP_ACCESS_CODE || '').trim()
    if (code) {
      headers['X-Access-Code'] = code
      headers.Authorization = `Bearer ${code}`
    }
  } else if (mode === 'anonymous') {
    headers['X-Device-Id'] = getOrCreateDeviceId()
  }
  return headers
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = {
    ...apiAuthHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  }
  return fetch(path, { ...init, headers })
}

export function isApiSessionReady(): boolean {
  const mode = resolveAuthMode()
  if (mode === 'cf-access') return true
  if (mode === 'anonymous') return true
  if (mode === 'oauth') return Boolean(document.cookie.includes('chicago_session='))
  return Boolean(readAuthSession()) || Boolean(import.meta.env.VITE_APP_ACCESS_CODE)
}
