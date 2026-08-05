export type AuthMode = 'access-code' | 'cf-access' | 'oauth' | 'anonymous'

export const AUTH_MODES: AuthMode[] = [
  'access-code',
  'cf-access',
  'oauth',
  'anonymous',
]

export function resolveAuthMode(): AuthMode {
  const raw = (import.meta.env.VITE_AUTH_MODE || 'access-code')
    .toString()
    .toLowerCase()
  if (
    raw === 'access-code' ||
    raw === 'cf-access' ||
    raw === 'oauth' ||
    raw === 'anonymous'
  ) {
    return raw
  }
  return 'access-code'
}

export function authModeLabel(mode: AuthMode): string {
  switch (mode) {
    case 'access-code':
      return 'Access code'
    case 'cf-access':
      return 'Cloudflare Access'
    case 'oauth':
      return 'OAuth'
    case 'anonymous':
      return 'Anonymous device'
  }
}

const DEVICE_KEY = 'agentchicago-device-id-v1'

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing && existing.length >= 8) return existing
    const id = `dev_${crypto.randomUUID().replace(/-/g, '')}`
    localStorage.setItem(DEVICE_KEY, id)
    return id
  } catch {
    return `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  }
}
