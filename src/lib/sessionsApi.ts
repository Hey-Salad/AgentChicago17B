import { apiFetch } from './apiClient'

export interface SessionSummary {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface SessionMessage {
  id: string
  role: string
  content: string
  stage?: string | null
  created_at: string
}

export async function fetchSessions(): Promise<SessionSummary[]> {
  const res = await apiFetch('/api/sessions')
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `Sessions failed (${res.status})`)
  }
  const data = (await res.json()) as { sessions: SessionSummary[] }
  return data.sessions ?? []
}

export async function createSession(title?: string): Promise<{ id: string; title: string }> {
  const res = await apiFetch('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ title: title || 'New research' }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `Create session failed (${res.status})`)
  }
  return (await res.json()) as { id: string; title: string }
}

export async function fetchSession(sessionId: string): Promise<{
  session: SessionSummary & { user_id?: string | null; device_id?: string | null }
  messages: SessionMessage[]
  briefs: Array<{ id: string; query: string; created_at: string }>
}> {
  const res = await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}`)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `Load session failed (${res.status})`)
  }
  return (await res.json()) as Awaited<ReturnType<typeof fetchSession>>
}

export async function postSessionMessage(
  sessionId: string,
  message: { role: string; content: string; stage?: string },
): Promise<{ id: string }> {
  const res = await apiFetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(message),
    },
  )
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `Message failed (${res.status})`)
  }
  return (await res.json()) as { id: string }
}

export async function saveBrief(input: {
  sessionId: string
  query: string
  brief: unknown
  markdown?: string
}): Promise<{ id: string }> {
  const res = await apiFetch('/api/briefs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `Save brief failed (${res.status})`)
  }
  return (await res.json()) as { id: string }
}

export async function putMemory(input: {
  kind: 'fact' | 'preference' | 'source'
  text: string
}): Promise<{ id: string }> {
  const res = await apiFetch('/api/memory', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `Memory failed (${res.status})`)
  }
  return (await res.json()) as { id: string }
}

export async function ragIngest(texts: string[]): Promise<void> {
  if (texts.length === 0) return
  await apiFetch('/api/rag/ingest', {
    method: 'POST',
    body: JSON.stringify({ texts }),
  })
}

export async function cacheSynthesis(
  key: string,
  value: unknown,
): Promise<void> {
  await apiFetch('/api/cache', {
    method: 'PUT',
    body: JSON.stringify({ key, value, ttlSeconds: 86400 }),
  })
}

export async function readCachedSynthesis(key: string): Promise<unknown | null> {
  const res = await apiFetch(`/api/cache/${encodeURIComponent(key)}`)
  if (!res.ok) return null
  const data = (await res.json()) as { hit?: boolean; value?: unknown }
  return data.hit ? data.value ?? null : null
}
