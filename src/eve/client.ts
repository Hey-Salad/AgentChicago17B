/**
 * Thin browser client for the Eve HTTP API.
 * Proxy `/eve` → Eve dev server (default http://127.0.0.1:3000) via vite.config.ts.
 */

export interface EveSessionStart {
  sessionId: string
  continuationToken?: string
  body: unknown
}

function eveBase(): string {
  return (import.meta.env.VITE_EVE_BASE_URL || '/eve').replace(/\/$/, '')
}

export async function startEveSession(message: string): Promise<EveSessionStart> {
  // Eve HTTP surface: POST /eve/v1/session
  const res = await fetch(`${eveBase()}/v1/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(
      typeof body.error === 'string'
        ? body.error
        : `Eve session failed (${res.status}). Is \`npm run eve\` running?`,
    )
  }
  const sessionId =
    (res.headers.get('x-eve-session-id') ||
      (typeof body.sessionId === 'string' ? body.sessionId : '') ||
      '') as string
  const continuationToken =
    typeof body.continuationToken === 'string' ? body.continuationToken : undefined
  return { sessionId, continuationToken, body }
}

export async function continueEveSession(
  continuationToken: string,
  message: string,
): Promise<EveSessionStart> {
  const res = await fetch(`${eveBase()}/v1/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, continuationToken }),
  })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(
      typeof body.error === 'string' ? body.error : `Eve continue failed (${res.status})`,
    )
  }
  const sessionId =
    (res.headers.get('x-eve-session-id') ||
      (typeof body.sessionId === 'string' ? body.sessionId : '') ||
      '') as string
  const nextToken =
    typeof body.continuationToken === 'string' ? body.continuationToken : continuationToken
  return { sessionId, continuationToken: nextToken, body }
}

export async function checkEveHealth(): Promise<{
  ok: boolean
  workflowId?: string
  error?: string
}> {
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 6000)
    const res = await fetch(`${eveBase()}/v1/health`, {
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timer))
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      return {
        ok: false,
        error:
          typeof body.error === 'string'
            ? body.error
            : `Health check failed (${res.status})`,
      }
    }
    return {
      ok: body.ok === true || body.status === 'ready',
      workflowId: typeof body.workflowId === 'string' ? body.workflowId : undefined,
      error:
        body.ok === true || body.status === 'ready'
          ? undefined
          : 'Eve reported not ready',
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Eve health unreachable',
    }
  }
}

/** Read NDJSON stream events as text lines (best-effort for the Admin panel). */
export async function readEveStream(
  sessionId: string,
  onLine: (line: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${eveBase()}/v1/session/${encodeURIComponent(sessionId)}/stream`, {
    signal,
  })
  if (!res.ok || !res.body) {
    throw new Error(`Eve stream failed (${res.status})`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n')
    buffer = parts.pop() || ''
    for (const line of parts) {
      if (line.trim()) onLine(line)
    }
  }
  if (buffer.trim()) onLine(buffer)
}
