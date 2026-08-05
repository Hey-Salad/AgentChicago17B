import type { AuthContext, Env } from '../env'
import { error, id, json, readJson } from '../http'

export async function listMemory(env: Env, ctx: AuthContext): Promise<Response> {
  let q =
    'SELECT id, kind, text, embedding_id, created_at FROM memory_items WHERE workspace_id = ?'
  const binds: string[] = [ctx.workspaceId]
  if (ctx.userId) {
    q += ' AND (user_id IS NULL OR user_id = ?)'
    binds.push(ctx.userId)
  }
  q += ' ORDER BY created_at DESC LIMIT 200'
  const { results } = await env.DB.prepare(q).bind(...binds).all()
  return json({ items: results ?? [] })
}

export async function upsertMemory(
  req: Request,
  env: Env,
  ctx: AuthContext,
): Promise<Response> {
  const body = await readJson<{
    kind: 'fact' | 'preference' | 'source'
    text: string
    embeddingId?: string
  }>(req)
  if (!body.text?.trim() || !['fact', 'preference', 'source'].includes(body.kind)) {
    return error(400, 'kind (fact|preference|source) and text are required')
  }
  const itemId = id('mem')
  await env.DB.prepare(
    `INSERT INTO memory_items (id, workspace_id, user_id, kind, text, embedding_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      itemId,
      ctx.workspaceId,
      ctx.userId,
      body.kind,
      body.text.trim(),
      body.embeddingId ?? null,
    )
    .run()
  return json({ id: itemId }, 201)
}
