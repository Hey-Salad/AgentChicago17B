import type { AuthContext, Env } from '../env'
import { error, id, json, readJson } from '../http'

export async function createBrief(
  req: Request,
  env: Env,
  ctx: AuthContext,
): Promise<Response> {
  const body = await readJson<{
    sessionId: string
    query: string
    brief: unknown
    markdown?: string
  }>(req)
  if (!body.sessionId || !body.query || body.brief == null) {
    return error(400, 'sessionId, query, and brief are required')
  }
  const session = await env.DB.prepare(
    `SELECT id FROM sessions WHERE id = ? AND workspace_id = ?`,
  )
    .bind(body.sessionId, ctx.workspaceId)
    .first()
  if (!session) return error(404, 'Session not found')

  const briefId = id('brf')
  const payload = JSON.stringify(body.brief)
  let r2Key: string | null = null
  if (body.markdown) {
    r2Key = `briefs/${briefId}.md`
    await env.BLOBS.put(r2Key, body.markdown, {
      httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
    })
  }
  await env.DB.prepare(
    `INSERT INTO briefs (id, session_id, query, json, r2_key)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(briefId, body.sessionId, body.query, payload, r2Key)
    .run()
  await env.DB.prepare(
    `UPDATE sessions SET updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(body.sessionId)
    .run()
  return json({ id: briefId, r2Key }, 201)
}

export async function getBrief(
  env: Env,
  ctx: AuthContext,
  briefId: string,
): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT b.id, b.session_id, b.query, b.json, b.r2_key, b.created_at
     FROM briefs b
     JOIN sessions s ON s.id = b.session_id
     WHERE b.id = ? AND s.workspace_id = ?`,
  )
    .bind(briefId, ctx.workspaceId)
    .first<{
      id: string
      session_id: string
      query: string
      json: string
      r2_key: string | null
      created_at: string
    }>()
  if (!row) return error(404, 'Brief not found')
  return json({
    id: row.id,
    sessionId: row.session_id,
    query: row.query,
    brief: JSON.parse(row.json),
    r2Key: row.r2_key,
    createdAt: row.created_at,
  })
}

export async function createShare(
  req: Request,
  env: Env,
  ctx: AuthContext,
): Promise<Response> {
  const body = await readJson<{ briefId: string; expiresInDays?: number }>(req)
  if (!body.briefId) return error(400, 'briefId is required')
  const brief = await env.DB.prepare(
    `SELECT b.id FROM briefs b
     JOIN sessions s ON s.id = b.session_id
     WHERE b.id = ? AND s.workspace_id = ?`,
  )
    .bind(body.briefId, ctx.workspaceId)
    .first()
  if (!brief) return error(404, 'Brief not found')
  const token = id('shr')
  const days = body.expiresInDays ?? 30
  const expires = new Date(Date.now() + days * 86400000).toISOString()
  await env.DB.prepare(
    `INSERT INTO share_links (token, brief_id, expires_at) VALUES (?, ?, ?)`,
  )
    .bind(token, body.briefId, expires)
    .run()
  return json({ token, url: `/api/share/${token}`, expiresAt: expires }, 201)
}

export async function getShare(env: Env, token: string): Promise<Response> {
  const link = await env.DB.prepare(
    `SELECT token, brief_id, expires_at FROM share_links WHERE token = ?`,
  )
    .bind(token)
    .first<{ token: string; brief_id: string; expires_at: string | null }>()
  if (!link) return error(404, 'Share link not found')
  if (link.expires_at && Date.parse(link.expires_at) < Date.now()) {
    return error(410, 'Share link expired')
  }
  const row = await env.DB.prepare(
    `SELECT id, query, json, created_at FROM briefs WHERE id = ?`,
  )
    .bind(link.brief_id)
    .first<{ id: string; query: string; json: string; created_at: string }>()
  if (!row) return error(404, 'Brief not found')
  return json({
    id: row.id,
    query: row.query,
    brief: JSON.parse(row.json),
    createdAt: row.created_at,
  })
}
