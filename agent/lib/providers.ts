/**
 * Descriptive catalog for Eve inference backends.
 * Runtime resolution lives in `./model.ts`; this file is the shared vocabulary
 * for docs, Admin copy, and future pickers.
 *
 * @see docs/eve-inference-providers.md
 */

export type EveInferenceShape = 'gateway-string' | 'language-model'

export type EveLlmBackend = 'cloudflare' | 'vercel-gateway'

export interface EveInferenceProvider {
  /** Stable catalog id, e.g. `vercel-gateway:zai/glm-5.2`. */
  id: string
  backend: EveLlmBackend
  label: string
  blurb: string
  /** Value for EVE_MODEL / gateway string / CF model id. */
  modelRef: string
  shape: EveInferenceShape
  /** Env vars the operator must set for this row to work. */
  env: string[]
  /** Where this is the natural default. */
  defaultOn: Array<'local' | 'vercel'>
  freeTierNote: string
}

/**
 * Eve-facing provider rows. Keep separate from classic `RESEARCH_MODELS`:
 * Gateway strings and `@cf/…` ids are not interchangeable.
 */
export const EVE_INFERENCE_PROVIDERS: EveInferenceProvider[] = [
  {
    id: 'vercel-gateway:zai/glm-5.2',
    backend: 'vercel-gateway',
    label: 'Vercel · GLM 5.2',
    blurb: 'AI Gateway string — default on Vercel (OIDC / AI_GATEWAY_API_KEY)',
    modelRef: 'zai/glm-5.2',
    shape: 'gateway-string',
    env: ['EVE_LLM_BACKEND=vercel-gateway', 'EVE_MODEL', 'AI_GATEWAY_API_KEY?'],
    defaultOn: ['vercel'],
    freeTierNote:
      'Uses Vercel AI Gateway credits / plan — not Cloudflare Neurons.',
  },
  {
    id: 'vercel-gateway:anthropic/claude-sonnet-4.6',
    backend: 'vercel-gateway',
    label: 'Vercel · Claude Sonnet 4.6',
    blurb: 'Swap providers by changing the Gateway model string only',
    modelRef: 'anthropic/claude-sonnet-4.6',
    shape: 'gateway-string',
    env: ['EVE_LLM_BACKEND=vercel-gateway', 'EVE_MODEL', 'AI_GATEWAY_API_KEY?'],
    defaultOn: [],
    freeTierNote: 'Subject to Gateway catalog + your Vercel / provider terms.',
  },
  {
    id: 'cloudflare:glm-5.2',
    backend: 'cloudflare',
    label: 'Cloudflare · GLM 5.2',
    blurb: 'LanguageModel via AI Gateway / Workers AI (OpenAI-compatible)',
    modelRef: '@cf/zai-org/glm-5.2',
    shape: 'language-model',
    env: [
      'EVE_LLM_BACKEND=cloudflare',
      'CF_ACCOUNT_ID',
      'CF_API_TOKEN',
      'EVE_MODEL',
    ],
    defaultOn: ['local'],
    freeTierNote:
      'Workers Paid for GLM 5.2. Free Neurons: use Llama 3.3 / 3.2 instead.',
  },
  {
    id: 'cloudflare:llama-3.3-70b',
    backend: 'cloudflare',
    label: 'Cloudflare · Llama 3.3 70B',
    blurb: 'Strong Free-tier Workers AI pick for Eve locally',
    modelRef: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    shape: 'language-model',
    env: [
      'EVE_LLM_BACKEND=cloudflare',
      'CF_ACCOUNT_ID',
      'CF_API_TOKEN',
      'EVE_MODEL',
    ],
    defaultOn: [],
    freeTierNote: 'Fits Cloudflare Workers Free (10k Neurons/day) in most cases.',
  },
]

export function eveProvidersForBackend(
  backend: EveLlmBackend,
): EveInferenceProvider[] {
  return EVE_INFERENCE_PROVIDERS.filter((row) => row.backend === backend)
}

export function describeEveBackend(backend: EveLlmBackend): string {
  if (backend === 'cloudflare') {
    return 'Cloudflare Workers AI (LanguageModel · OpenAI-compatible)'
  }
  return 'Vercel AI Gateway (model string)'
}
