import type { AuthContext, AuthMode, Env } from '../env'

export type AuthResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; status: number; error: string }

function parseMode(raw: string | undefined): AuthMode {
  const mode = (raw || 'access-code').toLowerCase()
  if (
    mode === 'access-code' ||
    mode === 'cf-access' ||
    mode === 'oauth' ||
    mode === 'anonymous'
  ) {
    return mode
  }
  return 'access-code'
}

function bearer(req: Request): string | null {
  const h = req.headers.get('Authorization')
  if (!h?.toLowerCase().startsWith('bearer ')) return null
  return h.slice(7).trim()
}

async function accessCode(req: Request, env: Env): Promise<AuthResult> {
  const expected = (env.ACCESS_CODE || '').trim()
  if (!expected) {
    return {
      ok: false,
      status: 500,
      error: 'ACCESS_CODE is not configured on the Worker.',
    }
  }
  const code =
    req.headers.get('X-Access-Code')?.trim() ||
    bearer(req) ||
    ''
  if (code !== expected) {
    return { ok: false, status: 401, error: 'Invalid access code.' }
  }
  return {
    ok: true,
    ctx: {
      mode: 'access-code',
      userId: null,
      workspaceId: env.WORKSPACE_ID || 'ws_default',
    },
  }
}

/** Stub: validate Cloudflare Access JWT (wire JWKS in a follow-up). */
async function cfAccess(req: Request, env: Env): Promise<AuthResult> {
  const assertion = req.headers.get('Cf-Access-Jwt-Assertion')
  if (!assertion) {
    return {
      ok: false,
      status: 401,
      error: 'Missing Cf-Access-Jwt-Assertion. Put Cloudflare Access in front of this app.',
    }
  }
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) {
    return {
      ok: false,
      status: 501,
      error:
        'cf-access adapter stub: set CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD, then enable JWT verification.',
    }
  }
  // Production: verify JWT against https://<team>.cloudflareaccess.com/cdn-cgi/access/certs
  return {
    ok: true,
    ctx: {
      mode: 'cf-access',
      userId: 'cf-access-user',
      workspaceId: env.WORKSPACE_ID || 'ws_default',
      subject: 'cf-access',
    },
  }
}

/** Stub: OAuth session cookie flow. */
async function oauth(req: Request, env: Env): Promise<AuthResult> {
  const cookie = req.headers.get('Cookie') || ''
  const match = cookie.match(/(?:^|;\s*)chicago_session=([^;]+)/)
  if (!match) {
    return {
      ok: false,
      status: 401,
      error: 'Not signed in. OAuth adapter is stubbed — configure OAUTH_* and complete the flow.',
    }
  }
  if (!env.OAUTH_CLIENT_ID || !env.OAUTH_CLIENT_SECRET) {
    return {
      ok: false,
      status: 501,
      error: 'oauth adapter stub: set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET.',
    }
  }
  return {
    ok: true,
    ctx: {
      mode: 'oauth',
      userId: decodeURIComponent(match[1]),
      workspaceId: env.WORKSPACE_ID || 'ws_default',
    },
  }
}

async function anonymous(req: Request, env: Env): Promise<AuthResult> {
  const deviceId = req.headers.get('X-Device-Id')?.trim()
  if (!deviceId || deviceId.length < 8) {
    return {
      ok: false,
      status: 401,
      error: 'X-Device-Id header required for anonymous mode.',
    }
  }
  return {
    ok: true,
    ctx: {
      mode: 'anonymous',
      userId: null,
      workspaceId: env.WORKSPACE_ID || 'ws_default',
      deviceId,
    },
  }
}

export async function authenticate(req: Request, env: Env): Promise<AuthResult> {
  const mode = parseMode(env.AUTH_MODE)
  switch (mode) {
    case 'cf-access':
      return cfAccess(req, env)
    case 'oauth':
      return oauth(req, env)
    case 'anonymous':
      return anonymous(req, env)
    case 'access-code':
    default:
      return accessCode(req, env)
  }
}

export function authMode(env: Env): AuthMode {
  return parseMode(env.AUTH_MODE)
}

/** Health and public share GETs skip auth. */
export function isPublicPath(pathname: string, method: string): boolean {
  if (pathname === '/api/health') return true
  if (pathname === '/api/auth/mode') return true
  if (pathname === '/api/auth/verify' && method === 'POST') return true
  if (method === 'GET' && pathname.startsWith('/api/share/')) return true
  return false
}
