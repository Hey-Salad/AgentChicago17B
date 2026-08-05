import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const WHISPER_MODEL =
  process.env.VITE_CF_WHISPER_MODEL || '@cf/openai/whisper-large-v3-turbo'

function readBody(req: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      resolve(Buffer.concat(chunks))
    } catch (error) {
      reject(error)
    }
  })
}

function accountIdFromBase(baseUrl: string): string | null {
  const match = baseUrl.match(/\/accounts\/([^/]+)/i)
  return match?.[1] ?? null
}

function runEndpoint(accountId: string, model: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`
}

/**
 * Browser cannot call api.cloudflare.com / NVIDIA directly (CORS).
 * Keeps keys on the Vite server for chat + Whisper STT.
 */
function aiProxyPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'agentchicago-ai-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        if (url.startsWith('/api/llm/chat') && req.method === 'POST') {
          try {
            const raw = await readBody(req)
            const body = JSON.parse(raw.toString('utf8') || '{}') as {
              model?: string
              messages?: unknown
              temperature?: number
              max_tokens?: number
            }

            const model = body.model || ''
            const useCloudflare = model.startsWith('@cf/')
            const baseUrl = (
              useCloudflare
                ? env.VITE_CF_BASE_URL || env.VITE_LLM_BASE_URL
                : env.VITE_LLM_BASE_URL
            )?.replace(/\/$/, '')
            const apiKey = useCloudflare
              ? env.VITE_CF_API_KEY || env.VITE_LLM_API_KEY
              : env.VITE_LLM_API_KEY

            if (!baseUrl || !apiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  error: useCloudflare
                    ? 'Cloudflare Workers AI is not configured on the Vite server.'
                    : 'NVIDIA LLM is not configured on the Vite server.',
                }),
              )
              return
            }

            const upstream = await fetch(`${baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model,
                messages: body.messages,
                temperature: body.temperature ?? 0.2,
                max_tokens: body.max_tokens ?? 1600,
                stream: false,
              }),
            })

            const text = await upstream.text()
            res.statusCode = upstream.status
            res.setHeader(
              'Content-Type',
              upstream.headers.get('content-type') || 'application/json',
            )
            res.end(text)
          } catch (error) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : 'LLM proxy failed to reach the provider',
              }),
            )
          }
          return
        }

        if (url.startsWith('/api/stt/transcribe') && req.method === 'POST') {
          try {
            const raw = await readBody(req)
            const body = JSON.parse(raw.toString('utf8') || '{}') as {
              audioBase64?: string
              mimeType?: string
              model?: string
              language?: string
            }

            const apiKey = env.VITE_CF_API_KEY || env.VITE_LLM_API_KEY
            const baseUrl = (env.VITE_CF_BASE_URL || env.VITE_LLM_BASE_URL || '').replace(
              /\/$/,
              '',
            )
            const accountId = accountIdFromBase(baseUrl)
            const model = body.model || env.VITE_CF_WHISPER_MODEL || WHISPER_MODEL

            if (!apiKey || !accountId) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  error:
                    'Cloudflare Workers AI is not configured for speech (need VITE_CF_API_KEY + account in VITE_CF_BASE_URL).',
                }),
              )
              return
            }

            if (!body.audioBase64?.trim()) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing audioBase64' }))
              return
            }

            const audio = body.audioBase64.replace(/^data:[^;]+;base64,/, '')
            const upstream = await fetch(runEndpoint(accountId, model), {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                audio,
                task: 'transcribe',
                ...(body.language ? { language: body.language } : {}),
              }),
            })

            const text = await upstream.text()
            let payload: unknown
            try {
              payload = JSON.parse(text)
            } catch {
              payload = { raw: text }
            }

            // Normalize common Workers AI shapes → { text }
            const normalized = normalizeWhisperResponse(payload)
            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(normalized))
          } catch (error) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : 'Speech proxy failed to reach Cloudflare Whisper',
              }),
            )
          }
          return
        }

        next()
      })
    },
  }
}

function normalizeWhisperResponse(payload: unknown): {
  text: string
  raw?: unknown
  error?: string
} {
  if (!payload || typeof payload !== 'object') {
    return { text: '', raw: payload }
  }
  const data = payload as Record<string, unknown>
  if (typeof data.error === 'string') {
    return { text: '', error: data.error, raw: payload }
  }
  if (typeof data.text === 'string') {
    return { text: data.text.trim(), raw: payload }
  }
  const result = data.result
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>
    if (typeof r.text === 'string') return { text: r.text.trim(), raw: payload }
    if (typeof r.transcription === 'string') {
      return { text: r.transcription.trim(), raw: payload }
    }
  }
  if (typeof data.transcription === 'string') {
    return { text: data.transcription.trim(), raw: payload }
  }
  // CF errors often look like { success: false, errors: [...] }
  if (data.success === false && Array.isArray(data.errors)) {
    const first = data.errors[0] as { message?: string } | undefined
    return {
      text: '',
      error: first?.message || 'Cloudflare Whisper request failed',
      raw: payload,
    }
  }
  return { text: '', raw: payload, error: 'No transcription text returned' }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), aiProxyPlugin(env)],
  }
})
