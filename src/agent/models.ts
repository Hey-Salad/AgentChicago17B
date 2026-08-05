export type ModelProvider = 'cloudflare' | 'nvidia' | 'openrouter'

export interface ModelOption {
  id: string
  label: string
  blurb: string
  provider: ModelProvider
  /**
   * Likely usable without a paid platform upgrade.
   * Cloudflare: Workers Free (10k Neurons/day) — GLM 5.2 is Paid-only (Jul 2026).
   * NVIDIA: free Build tier that actually completes for this agent.
   * OpenRouter: auto / open models (credits / `:free` vary by account).
   */
  freeTier?: boolean
}

/**
 * Models verified for desk-research JSON synthesis.
 * Cloudflare results: docs/cloudflare-model-benchmark.json
 * NVIDIA results: docs/model-benchmark.json
 * OpenRouter: OpenAI-compatible router — pick any model your key can call.
 */
export const RESEARCH_MODELS: ModelOption[] = [
  {
    id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    label: 'CF Llama 3.3 70B',
    blurb: 'Best Cloudflare Free pick — strong briefs, ~3s',
    provider: 'cloudflare',
    freeTier: true,
  },
  {
    id: '@cf/meta/llama-3.2-3b-instruct',
    label: 'CF Llama 3.2 3B',
    blurb: 'Fastest Cloudflare Free option, ~1.4s',
    provider: 'cloudflare',
    freeTier: true,
  },
  {
    id: '@cf/meta/llama-4-scout-17b-16e-instruct',
    label: 'CF Llama 4 Scout',
    blurb: 'Solid mid-size Cloudflare model',
    provider: 'cloudflare',
    freeTier: true,
  },
  {
    id: '@cf/openai/gpt-oss-20b',
    label: 'CF GPT-OSS 20B',
    blurb: 'Reasoning model — good structure',
    provider: 'cloudflare',
    freeTier: true,
  },
  {
    id: '@cf/zai-org/glm-5.2',
    label: 'CF GLM 5.2',
    blurb: 'Workers Paid only (403 on Free) — strongest CF reasoning',
    provider: 'cloudflare',
    freeTier: false,
  },
  {
    id: '@cf/meta/llama-3.1-8b-instruct-fp8',
    label: 'CF Llama 3.1 8B',
    blurb: 'Fast general Cloudflare instruct model',
    provider: 'cloudflare',
    freeTier: true,
  },
  {
    id: '@cf/mistralai/mistral-small-3.1-24b-instruct',
    label: 'CF Mistral Small',
    blurb: 'Reliable Cloudflare instruct model',
    provider: 'cloudflare',
    freeTier: true,
  },
  {
    id: 'openrouter/auto',
    label: 'OpenRouter Auto',
    blurb: 'Lets OpenRouter pick a strong available model',
    provider: 'openrouter',
    freeTier: true,
  },
  {
    id: 'anthropic/claude-sonnet-4',
    label: 'OR Claude Sonnet 4',
    blurb: 'OpenRouter — excellent briefs (paid)',
    provider: 'openrouter',
    freeTier: false,
  },
  {
    id: 'openai/gpt-4.1-mini',
    label: 'OR GPT-4.1 Mini',
    blurb: 'OpenRouter — fast structured JSON',
    provider: 'openrouter',
    freeTier: false,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    label: 'OR Llama 3.3 70B',
    blurb: 'OpenRouter — open-weight workhorse',
    provider: 'openrouter',
    freeTier: true,
  },
  {
    id: 'meta/llama-3.1-8b-instruct',
    label: 'NVIDIA Llama 3.1 8B',
    blurb: 'Best NVIDIA free-tier option',
    provider: 'nvidia',
    freeTier: true,
  },
  {
    id: 'meta/llama-3.1-70b-instruct',
    label: 'NVIDIA Llama 3.1 70B',
    blurb: 'Works on NVIDIA, often slow',
    provider: 'nvidia',
    freeTier: true,
  },
  {
    id: 'z-ai/glm-5.2',
    label: 'NVIDIA GLM 5.2',
    blurb: 'Often times out on NVIDIA free tier',
    provider: 'nvidia',
    freeTier: false,
  },
]

export const DEFAULT_MODEL_ID =
  (import.meta.env.VITE_LLM_MODEL as string | undefined) ||
  '@cf/zai-org/glm-5.2'

export function modelLabel(id: string): string {
  return RESEARCH_MODELS.find((model) => model.id === id)?.label ?? id
}

export function modelProvider(id: string): ModelProvider {
  if (id.startsWith('@cf/')) return 'cloudflare'
  if (id.startsWith('openrouter/')) return 'openrouter'
  const listed = RESEARCH_MODELS.find((model) => model.id === id)?.provider
  if (listed) return listed
  // Heuristic: org/model slugs that are not NVIDIA meta/ or z-ai/ go to OpenRouter
  // when the OpenRouter base is configured; otherwise NVIDIA.
  if (id.includes('/') && !id.startsWith('meta/') && !id.startsWith('z-ai/')) {
    return 'openrouter'
  }
  return 'nvidia'
}
