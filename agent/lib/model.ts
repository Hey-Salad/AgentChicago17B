import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

export type EveLlmBackend = 'cloudflare' | 'vercel-gateway'

/**
 * Resolve the Eve model.
 *
 * - On Vercel (`VERCEL=1`) or EVE_LLM_BACKEND=vercel-gateway: AI Gateway string id
 * - Else cloudflare: Cloudflare AI Gateway / Workers AI (OpenAI-compatible)
 */
export function resolveEveModel() {
  const forced = (process.env.EVE_LLM_BACKEND || '').toLowerCase()
  const onVercel = Boolean(process.env.VERCEL)

  if (forced === 'cloudflare') {
    return createCloudflareGatewayModel()
  }

  if (forced === 'vercel-gateway' || forced === 'vercel' || onVercel) {
    return process.env.EVE_MODEL || 'zai/glm-5.2'
  }

  // Local default: Cloudflare if credentials exist, else Vercel Gateway string
  const hasCf =
    Boolean(process.env.CF_API_TOKEN || process.env.VITE_CF_API_KEY) &&
    Boolean(
      process.env.CF_ACCOUNT_ID ||
        process.env.CF_AI_GATEWAY_BASE_URL ||
        process.env.VITE_CF_BASE_URL,
    )

  if (hasCf) return createCloudflareGatewayModel()
  return process.env.EVE_MODEL || 'zai/glm-5.2'
}

function createCloudflareGatewayModel() {
  const accountId =
    process.env.CF_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    extractAccountId(process.env.VITE_CF_BASE_URL || process.env.CF_AI_BASE_URL || '')

  const apiKey =
    process.env.CF_API_TOKEN ||
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.VITE_CF_API_KEY ||
    ''

  const gatewayId = process.env.CF_AIG_GATEWAY_ID || process.env.CF_AI_GATEWAY_ID || 'default'

  const baseURL = (
    process.env.CF_AI_GATEWAY_BASE_URL ||
    (accountId
      ? `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`
      : '')
  ).replace(/\/$/, '')

  if (!apiKey || !baseURL) {
    throw new Error(
      [
        'Cloudflare AI Gateway is not configured for Eve.',
        'Set CF_API_TOKEN and CF_ACCOUNT_ID, or set EVE_LLM_BACKEND=vercel-gateway.',
        'See docs/eve-cloudflare.md',
      ].join(' '),
    )
  }

  const modelId =
    process.env.EVE_MODEL ||
    process.env.EVE_CF_MODEL ||
    (baseURL.includes('/compat')
      ? 'workers-ai/@cf/zai-org/glm-5.2'
      : '@cf/zai-org/glm-5.2')

  const cf = createOpenAICompatible({
    name: 'cloudflare-ai-gateway',
    apiKey,
    baseURL,
    headers: {
      'cf-aig-gateway-id': gatewayId,
    },
  })

  return cf.chatModel(modelId)
}

function extractAccountId(baseUrl: string): string {
  const match = baseUrl.match(/\/accounts\/([^/]+)/i)
  return match?.[1] ?? ''
}
