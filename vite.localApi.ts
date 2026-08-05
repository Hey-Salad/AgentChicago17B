/**
 * In-memory Cloudflare API shim for `npm run dev` (no Wrangler required).
 * Mirrors workers/api routes for sessions, briefs, memory, cache, rag stubs, health.
 */
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

type Row = Record<string, unknown>

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export function localCloudApiPlugin(env: Record<string, string>): Plugin {
  const authMode = (env.VITE_AUTH_MODE || 'access-code').toLowerCase()
  const accessCode = (env.VITE_APP_ACCESS_CODE || '').trim()
  const workspaceId = 'ws_default'

  const sessions = new Map<string, Row>()
  const messages = new Map<string, Row[]>()
  const briefs = new Map<string, Row>()
  const memory: Row[] = []
  const cache = new Map<string, unknown>()
  const share = new Map<string, { briefId: string; expiresAt: string }>()
  const vectors: Array<{ id: string; text: string; meta?: Row }> = []

  function authed(
    req: IncomingMessage,
  ): { ok: true } | { ok: false; status: number; error: string } {
    if (authMode === 'anonymous') {
      const device = String(req.headers['x-device-id'] || '')
      if (device.length < 8) {
        return { ok: false, status: 401, error: 'X-Device-Id required' }
      }
      return { ok: true }
    }
    if (authMode === 'cf-access' || authMode === 'oauth') {
      return { ok: true }
    }
    const code =
      String(req.headers['x-access-code'] || '').trim() ||
      String(req.headers.authorization || '')
        .replace(/^Bearer\s+/i, '')
        .trim()
    if (!accessCode) {
      return { ok: true }
    }
    if (code !== accessCode) {
      return { ok: false, status: 401, error: 'Invalid access code.' }
    }
    return { ok: true }
  }

  return {
    name: 'agentchicago-local-cloud-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith('/api/')) {
          next()
          return
        }
        const path = url.split('?')[0]
        if (
          path.startsWith('/api/llm/') ||
          path.startsWith('/api/stt/') ||
          path.startsWith('/eve')
        ) {
          next()
          return
        }

        const method = (req.method || 'GET').toUpperCase()
        if (method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        try {
          if (path === '/api/health' && method === 'GET') {
            json(res, 200, {
              ok: true,
              service: 'agentchicago17b-local',
              authMode,
              workspaceId,
            })
            return
          }
          if (path === '/api/auth/mode' && method === 'GET') {
            json(res, 200, {
              mode: authMode,
              adapters: ['access-code', 'cf-access', 'oauth', 'anonymous'],
            })
            return
          }

          if (path === '/api/auth/verify' && method === 'POST') {
            const body = JSON.parse((await readBody(req)) || '{}') as { code?: string }
            if (authMode !== 'access-code') {
              json(res, 200, { ok: true, mode: authMode })
              return
            }
            if (!accessCode) {
              // Local: accept any non-empty code when none configured
              if ((body.code || '').trim()) {
                json(res, 200, { ok: true, mode: 'access-code' })
                return
              }
              json(res, 401, { error: 'Enter an access code.' })
              return
            }
            if ((body.code || '').trim() !== accessCode) {
              json(res, 401, { error: 'Invalid access code.' })
              return
            }
            json(res, 200, { ok: true, mode: 'access-code' })
            return
          }

          if (path.startsWith('/api/share/') && method === 'GET') {
            const token = path.slice('/api/share/'.length)
            const link = share.get(token)
            if (!link) {
              json(res, 404, { error: 'Share link not found' })
              return
            }
            const brief = briefs.get(link.briefId)
            if (!brief) {
              json(res, 404, { error: 'Brief not found' })
              return
            }
            json(res, 200, {
              id: brief.id,
              query: brief.query,
              brief: brief.brief,
              createdAt: brief.created_at,
            })
            return
          }

          const gate = authed(req)
          if (!gate.ok) {
            json(res, gate.status, { error: gate.error })
            return
          }

          const deviceId = String(req.headers['x-device-id'] || '') || null

          if (path === '/api/sessions' && method === 'GET') {
            let list = [...sessions.values()]
            if (authMode === 'anonymous' && deviceId) {
              list = list.filter((s) => s.device_id === deviceId)
            }
            list.sort((a, b) =>
              String(b.updated_at).localeCompare(String(a.updated_at)),
            )
            json(res, 200, { sessions: list })
            return
          }

          if (path === '/api/sessions' && method === 'POST') {
            const body = JSON.parse((await readBody(req)) || '{}') as {
              title?: string
            }
            const sessionId = id('ses')
            const row = {
              id: sessionId,
              title: (body.title || 'New research').trim() || 'New research',
              workspace_id: workspaceId,
              user_id: null,
              device_id: deviceId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            sessions.set(sessionId, row)
            messages.set(sessionId, [])
            json(res, 201, { id: sessionId, title: row.title })
            return
          }

          const sessionGet = path.match(/^\/api\/sessions\/([^/]+)$/)
          if (sessionGet && method === 'GET') {
            const session = sessions.get(sessionGet[1])
            if (!session) {
              json(res, 404, { error: 'Session not found' })
              return
            }
            const briefsFor = [...briefs.values()].filter(
              (b) => b.session_id === sessionGet[1],
            )
            json(res, 200, {
              session,
              messages: messages.get(sessionGet[1]) ?? [],
              briefs: briefsFor.map((b) => ({
                id: b.id,
                query: b.query,
                created_at: b.created_at,
              })),
            })
            return
          }

          const msgPost = path.match(/^\/api\/sessions\/([^/]+)\/messages$/)
          if (msgPost && method === 'POST') {
            const session = sessions.get(msgPost[1])
            if (!session) {
              json(res, 404, { error: 'Session not found' })
              return
            }
            const body = JSON.parse((await readBody(req)) || '{}') as {
              role: string
              content: string
              stage?: string
            }
            const messageId = id('msg')
            const list = messages.get(msgPost[1]) ?? []
            list.push({
              id: messageId,
              role: body.role,
              content: body.content,
              stage: body.stage ?? null,
              created_at: new Date().toISOString(),
            })
            messages.set(msgPost[1], list)
            session.updated_at = new Date().toISOString()
            if (session.title === 'New research' && body.role === 'user') {
              session.title = body.content.slice(0, 80)
            }
            json(res, 201, { id: messageId })
            return
          }

          if (path === '/api/briefs' && method === 'POST') {
            const body = JSON.parse((await readBody(req)) || '{}') as {
              sessionId: string
              query: string
              brief: unknown
            }
            if (!sessions.has(body.sessionId)) {
              json(res, 404, { error: 'Session not found' })
              return
            }
            const briefId = id('brf')
            briefs.set(briefId, {
              id: briefId,
              session_id: body.sessionId,
              query: body.query,
              brief: body.brief,
              created_at: new Date().toISOString(),
            })
            json(res, 201, { id: briefId })
            return
          }

          const briefGet = path.match(/^\/api\/briefs\/([^/]+)$/)
          if (briefGet && method === 'GET') {
            const row = briefs.get(briefGet[1])
            if (!row) {
              json(res, 404, { error: 'Brief not found' })
              return
            }
            json(res, 200, {
              id: row.id,
              sessionId: row.session_id,
              query: row.query,
              brief: row.brief,
              createdAt: row.created_at,
            })
            return
          }

          if (path === '/api/share' && method === 'POST') {
            const body = JSON.parse((await readBody(req)) || '{}') as {
              briefId: string
            }
            if (!briefs.has(body.briefId)) {
              json(res, 404, { error: 'Brief not found' })
              return
            }
            const token = id('shr')
            const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString()
            share.set(token, { briefId: body.briefId, expiresAt })
            json(res, 201, {
              token,
              url: `/api/share/${token}`,
              expiresAt,
            })
            return
          }

          if (path === '/api/memory' && method === 'GET') {
            json(res, 200, { items: memory })
            return
          }
          if (path === '/api/memory' && method === 'PUT') {
            const body = JSON.parse((await readBody(req)) || '{}') as {
              kind: string
              text: string
            }
            const itemId = id('mem')
            memory.unshift({
              id: itemId,
              kind: body.kind,
              text: body.text,
              created_at: new Date().toISOString(),
            })
            json(res, 201, { id: itemId })
            return
          }

          if (path === '/api/rag/ingest' && method === 'POST') {
            const body = JSON.parse((await readBody(req)) || '{}') as {
              texts: string[]
            }
            let upserted = 0
            for (const text of body.texts || []) {
              if (!text?.trim()) continue
              vectors.push({ id: id('vec'), text: text.trim() })
              upserted++
            }
            json(res, 201, { upserted })
            return
          }
          if (path === '/api/rag/query' && method === 'POST') {
            const body = JSON.parse((await readBody(req)) || '{}') as {
              query: string
              topK?: number
            }
            const q = (body.query || '').toLowerCase()
            const matches = vectors
              .filter((v) => v.text.toLowerCase().includes(q.slice(0, 24)))
              .slice(0, body.topK ?? 5)
              .map((v) => ({ id: v.id, metadata: { text: v.text } }))
            json(res, 200, { matches })
            return
          }

          if (path === '/api/cache' && method === 'PUT') {
            const body = JSON.parse((await readBody(req)) || '{}') as {
              key: string
              value: unknown
            }
            cache.set(body.key, body.value)
            json(res, 200, { ok: true })
            return
          }
          if (path.startsWith('/api/cache/') && method === 'GET') {
            const key = decodeURIComponent(path.slice('/api/cache/'.length))
            if (!cache.has(key)) {
              json(res, 404, { hit: false })
              return
            }
            json(res, 200, { hit: true, value: cache.get(key) })
            return
          }

          next()
        } catch (err) {
          json(res, 500, {
            error: err instanceof Error ? err.message : 'Local API error',
          })
        }
      })
    },
  }
}
