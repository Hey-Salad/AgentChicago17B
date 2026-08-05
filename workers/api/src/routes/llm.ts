import type { Env } from '../env'
import { error, json, readJson } from '../http'

type Provider = 'cloudflare' | 'openrouter' | 'nvidia'

function resolveProvider(model: string, env: Env): Provider {
  if (model.startsWith('@cf/')) return 'cloudflare'
  if (model.startsWith('openrouter/')) return 'openrouter'
  if (env.OPENROUTER_API_KEY && model.includes('/')) return 'openrouter'
  return 'nvidia'
}

export async function llmChat(req: Request, env: Env): Promise<Response> {
  const body = await readJson<{
    model?: string
    messages?: unknown
    temperature?: number
    max_tokens?: number
  }>(req)
  const model = body.model || env.DEFAULT_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
  const provider = resolveProvider(model, env)

  let baseUrl = ''
  let apiKey = ''
  if (provider === 'cloudflare') {
    apiKey = env.CF_API_TOKEN || ''
    baseUrl = (
      env.CF_AI_BASE_URL ||
      (env.CF_ACCOUNT_ID
        ? `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/v1`
        : '')
    ).replace(/\/$/, '')
  } else if (provider === 'openrouter') {
    apiKey = env.OPENROUTER_API_KEY || ''
    baseUrl = 'https://openrouter.ai/api/v1'
  } else {
    apiKey = env.NVIDIA_API_KEY || ''
    baseUrl = (env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(
      /\/$/,
      '',
    )
  }

  if (!apiKey || !baseUrl) {
    return error(500, `${provider} LLM is not configured on the Worker.`)
  }

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(provider === 'openrouter'
        ? {
            'HTTP-Referer': 'https://github.com/Hey-Salad/AgentChicago17B',
            'X-Title': 'AgentChicago17B',
          }
        : {}),
    },
    body: JSON.stringify({
      model: model.replace(/^openrouter\//, ''),
      messages: body.messages,
      temperature: body.temperature ?? 0.2,
      max_tokens: body.max_tokens ?? 1600,
      stream: false,
    }),
  })

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('content-type') || 'application/json',
    },
  })
}
