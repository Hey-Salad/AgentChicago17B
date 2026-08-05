import { authenticate, authMode, isPublicPath } from './auth'
import type { Env } from './env'
import { error, json } from './http'
import {
  createBrief,
  createShare,
  getBrief,
  getShare,
} from './routes/briefs'
import { llmChat } from './routes/llm'
import { listMemory, upsertMemory } from './routes/memory'
import { cacheGet, cachePut, ragIngest, ragQuery } from './routes/rag'
import {
  addMessage,
  createSession,
  getSession,
  listSessions,
} from './routes/sessions'

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const { pathname } = url
    const method = req.method.toUpperCase()

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      })
    }

    try {
      if (pathname.startsWith('/api/')) {
        const res = await handleApi(req, env, pathname, method)
        return withCors(res)
      }

      if (env.ASSETS) {
        return env.ASSETS.fetch(req)
      }
      return error(404, 'Not found')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error'
      return withCors(error(500, message))
    }
  },
}

async function handleApi(
  req: Request,
  env: Env,
  pathname: string,
  method: string,
): Promise<Response> {
  if (pathname === '/api/health' && method === 'GET') {
    return json({
      ok: true,
      service: 'agentchicago17b',
      authMode: authMode(env),
      workspaceId: env.WORKSPACE_ID || 'ws_default',
    })
  }

  if (pathname === '/api/auth/mode' && method === 'GET') {
    return json({
      mode: authMode(env),
      adapters: ['access-code', 'cf-access', 'oauth', 'anonymous'],
    })
  }

  if (pathname === '/api/auth/verify' && method === 'POST') {
    const mode = authMode(env)
    if (mode !== 'access-code') {
      return json({ ok: true, mode })
    }
    const body = (await req.json().catch(() => ({}))) as { code?: string }
    const expected = (env.ACCESS_CODE || '').trim()
    if (!expected) {
      return error(500, 'ACCESS_CODE is not configured on the Worker.')
    }
    if ((body.code || '').trim() !== expected) {
      return error(401, 'Invalid access code.')
    }
    return json({ ok: true, mode: 'access-code' })
  }

  if (pathname.startsWith('/api/share/') && method === 'GET') {
    const token = pathname.slice('/api/share/'.length)
    return getShare(env, token)
  }

  if (!isPublicPath(pathname, method)) {
    const auth = await authenticate(req, env)
    if (!auth.ok) return error(auth.status, auth.error)
    const ctx = auth.ctx

    if (pathname === '/api/sessions' && method === 'GET') {
      return listSessions(env, ctx)
    }
    if (pathname === '/api/sessions' && method === 'POST') {
      return createSession(req, env, ctx)
    }
    const sessionMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/)
    if (sessionMatch && method === 'GET') {
      return getSession(env, ctx, sessionMatch[1])
    }
    const msgMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/messages$/)
    if (msgMatch && method === 'POST') {
      return addMessage(req, env, ctx, msgMatch[1])
    }

    if (pathname === '/api/briefs' && method === 'POST') {
      return createBrief(req, env, ctx)
    }
    const briefMatch = pathname.match(/^\/api\/briefs\/([^/]+)$/)
    if (briefMatch && method === 'GET') {
      return getBrief(env, ctx, briefMatch[1])
    }

    if (pathname === '/api/share' && method === 'POST') {
      return createShare(req, env, ctx)
    }

    if (pathname === '/api/memory' && method === 'GET') {
      return listMemory(env, ctx)
    }
    if (pathname === '/api/memory' && method === 'PUT') {
      return upsertMemory(req, env, ctx)
    }

    if (pathname === '/api/rag/ingest' && method === 'POST') {
      return ragIngest(req, env, ctx)
    }
    if (pathname === '/api/rag/query' && method === 'POST') {
      return ragQuery(req, env, ctx)
    }

    if (pathname.startsWith('/api/cache/') && method === 'GET') {
      return cacheGet(env, pathname.slice('/api/cache/'.length))
    }
    if (pathname === '/api/cache' && method === 'PUT') {
      return cachePut(req, env)
    }

    if (pathname === '/api/llm/chat' && method === 'POST') {
      return llmChat(req, env)
    }

    return error(404, `No route for ${method} ${pathname}`)
  }

  return error(404, 'Not found')
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Access-Code, X-Device-Id',
  }
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(corsHeaders())) {
    headers.set(k, v)
  }
  return new Response(res.body, { status: res.status, headers })
}
