import type { AuthContext, Env } from '../env'
import { error, id, json, readJson } from '../http'

const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5'

async function embed(env: Env, text: string): Promise<number[]> {
  const result = await env.AI.run(EMBED_MODEL, { text: [text] })
  const data = result as { data?: number[][] }
  const vector = data.data?.[0]
  if (!vector?.length) throw new Error('Embedding failed')
  return vector
}

export async function ragIngest(
  req: Request,
  env: Env,
  ctx: AuthContext,
): Promise<Response> {
  const body = await readJson<{
    texts: string[]
    namespace?: string
    metadata?: Record<string, string>
  }>(req)
  if (!Array.isArray(body.texts) || body.texts.length === 0) {
    return error(400, 'texts[] is required')
  }
  const namespace = body.namespace || ctx.workspaceId
  const vectors: VectorizeVector[] = []
  for (const text of body.texts.slice(0, 32)) {
    const trimmed = text.trim()
    if (!trimmed) continue
    const values = await embed(env, trimmed.slice(0, 6000))
    const vid = id('vec')
    vectors.push({
      id: vid,
      values,
      namespace,
      metadata: {
        workspaceId: ctx.workspaceId,
        text: trimmed.slice(0, 1500),
        ...(body.metadata ?? {}),
      },
    })
  }
  if (vectors.length === 0) return error(400, 'No non-empty texts')
  await env.VECTORS.upsert(vectors)
  return json({ upserted: vectors.length, ids: vectors.map((v) => v.id) }, 201)
}

export async function ragQuery(
  req: Request,
  env: Env,
  ctx: AuthContext,
): Promise<Response> {
  const body = await readJson<{ query: string; topK?: number }>(req)
  if (!body.query?.trim()) return error(400, 'query is required')
  const values = await embed(env, body.query.trim())
  const matches = await env.VECTORS.query(values, {
    topK: Math.min(body.topK ?? 5, 20),
    namespace: ctx.workspaceId,
    returnMetadata: 'all',
  })
  return json({ matches: matches.matches ?? [] })
}

/** Hash-keyed synthesis cache in KV. */
export async function cacheGet(env: Env, key: string): Promise<Response> {
  const hit = await env.CACHE.get(`synth:${key}`, 'json')
  if (!hit) return json({ hit: false }, 404)
  return json({ hit: true, value: hit })
}

export async function cachePut(
  req: Request,
  env: Env,
): Promise<Response> {
  const body = await readJson<{ key: string; value: unknown; ttlSeconds?: number }>(
    req,
  )
  if (!body.key || body.value == null) {
    return error(400, 'key and value are required')
  }
  await env.CACHE.put(`synth:${body.key}`, JSON.stringify(body.value), {
    expirationTtl: body.ttlSeconds ?? 86400,
  })
  return json({ ok: true })
}
