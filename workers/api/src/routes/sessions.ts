import type { AuthContext, Env } from '../env'
import { error, id, json, readJson } from '../http'

export async function listSessions(env: Env, ctx: AuthContext): Promise<Response> {
  let query =
    'SELECT id, title, created_at, updated_at FROM sessions WHERE workspace_id = ?'
  const binds: string[] = [ctx.workspaceId]
  if (ctx.mode === 'anonymous' && ctx.deviceId) {
    query += ' AND device_id = ?'
    binds.push(ctx.deviceId)
  } else if (ctx.userId) {
    query += ' AND user_id = ?'
    binds.push(ctx.userId)
  }
  query += ' ORDER BY updated_at DESC LIMIT 100'
  const { results } = await env.DB.prepare(query)
    .bind(...binds)
    .all()
  return json({ sessions: results ?? [] })
}

export async function createSession(
  req: Request,
  env: Env,
  ctx: AuthContext,
): Promise<Response> {
  const body = await readJson<{ title?: string }>(req)
  const sessionId = id('ses')
  const title = (body.title || 'New research').trim() || 'New research'
  await env.DB.prepare(
    `INSERT INTO sessions (id, workspace_id, user_id, device_id, title)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      sessionId,
      ctx.workspaceId,
      ctx.userId,
      ctx.deviceId ?? null,
      title,
    )
    .run()
  return json({ id: sessionId, title }, 201)
}

export async function getSession(
  env: Env,
  ctx: AuthContext,
  sessionId: string,
): Promise<Response> {
  const session = await env.DB.prepare(
    `SELECT id, title, user_id, device_id, created_at, updated_at
     FROM sessions WHERE id = ? AND workspace_id = ?`,
  )
    .bind(sessionId, ctx.workspaceId)
    .first()
  if (!session) return error(404, 'Session not found')
  if (ctx.mode === 'anonymous' && session.device_id !== ctx.deviceId) {
    return error(403, 'Session belongs to another device')
  }
  if (ctx.userId && session.user_id && session.user_id !== ctx.userId) {
    return error(403, 'Session belongs to another user')
  }
  const { results: messages } = await env.DB.prepare(
    `SELECT id, role, content, stage, created_at FROM messages
     WHERE session_id = ? ORDER BY created_at ASC`,
  )
    .bind(sessionId)
    .all()
  const { results: briefs } = await env.DB.prepare(
    `SELECT id, query, created_at FROM briefs
     WHERE session_id = ? ORDER BY created_at DESC`,
  )
    .bind(sessionId)
    .all()
  return json({ session, messages: messages ?? [], briefs: briefs ?? [] })
}

export async function addMessage(
  req: Request,
  env: Env,
  ctx: AuthContext,
  sessionId: string,
): Promise<Response> {
  const owned = await env.DB.prepare(
    `SELECT id, user_id, device_id FROM sessions WHERE id = ? AND workspace_id = ?`,
  )
    .bind(sessionId, ctx.workspaceId)
    .first<{ id: string; user_id: string | null; device_id: string | null }>()
  if (!owned) return error(404, 'Session not found')
  if (ctx.mode === 'anonymous' && owned.device_id !== ctx.deviceId) {
    return error(403, 'Forbidden')
  }
  const body = await readJson<{
    role: string
    content: string
    stage?: string
  }>(req)
  if (!body.role || !body.content?.trim()) {
    return error(400, 'role and content are required')
  }
  const messageId = id('msg')
  await env.DB.prepare(
    `INSERT INTO messages (id, session_id, role, content, stage)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(messageId, sessionId, body.role, body.content.trim(), body.stage ?? null)
    .run()
  await env.DB.prepare(
    `UPDATE sessions SET updated_at = datetime('now'), title = CASE
       WHEN title = 'New research' AND ? = 'user' THEN substr(?, 1, 80)
       ELSE title END
     WHERE id = ?`,
  )
    .bind(body.role, body.content.trim(), sessionId)
    .run()
  await env.CACHE.delete(`sessions:${ctx.workspaceId}`)
  return json({ id: messageId }, 201)
}
