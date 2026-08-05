export interface ModelOption {
  id: string
  label: string
  blurb: string
  provider: 'cloudflare' | 'nvidia'
}

/**
 * Models verified for desk-research JSON synthesis.
 * Cloudflare results: docs/cloudflare-model-benchmark.json
 * NVIDIA results: docs/model-benchmark.json
 */
export const RESEARCH_MODELS: ModelOption[] = [
  {
    id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    label: 'CF Llama 3.3 70B',
    blurb: 'Best Cloudflare pick — strong briefs, ~3s',
    provider: 'cloudflare',
  },
  {
    id: '@cf/meta/llama-3.2-3b-instruct',
    label: 'CF Llama 3.2 3B',
    blurb: 'Fastest Cloudflare option, ~1.4s',
    provider: 'cloudflare',
  },
  {
    id: '@cf/meta/llama-4-scout-17b-16e-instruct',
    label: 'CF Llama 4 Scout',
    blurb: 'Solid mid-size Cloudflare model',
    provider: 'cloudflare',
  },
  {
    id: '@cf/openai/gpt-oss-20b',
    label: 'CF GPT-OSS 20B',
    blurb: 'Reasoning model — good structure',
    provider: 'cloudflare',
  },
  {
    id: '@cf/zai-org/glm-5.2',
    label: 'CF GLM 5.2',
    blurb: 'Best reasoning for commercial-grade briefs (~10–20s)',
    provider: 'cloudflare',
  },
  {
    id: '@cf/meta/llama-3.1-8b-instruct-fp8',
    label: 'CF Llama 3.1 8B',
    blurb: 'Fast general Cloudflare instruct model',
    provider: 'cloudflare',
  },
  {
    id: '@cf/mistralai/mistral-small-3.1-24b-instruct',
    label: 'CF Mistral Small',
    blurb: 'Reliable Cloudflare instruct model',
    provider: 'cloudflare',
  },
  {
    id: 'meta/llama-3.1-8b-instruct',
    label: 'NVIDIA Llama 3.1 8B',
    blurb: 'Best NVIDIA free-tier option',
    provider: 'nvidia',
  },
  {
    id: 'meta/llama-3.1-70b-instruct',
    label: 'NVIDIA Llama 3.1 70B',
    blurb: 'Works on NVIDIA, often slow',
    provider: 'nvidia',
  },
  {
    id: 'z-ai/glm-5.2',
    label: 'NVIDIA GLM 5.2',
    blurb: 'Often times out on NVIDIA free tier',
    provider: 'nvidia',
  },
]

export const DEFAULT_MODEL_ID =
  (import.meta.env.VITE_LLM_MODEL as string | undefined) ||
  '@cf/zai-org/glm-5.2'

export function modelLabel(id: string): string {
  return RESEARCH_MODELS.find((model) => model.id === id)?.label ?? id
}

export function modelProvider(id: string): 'cloudflare' | 'nvidia' {
  if (id.startsWith('@cf/')) return 'cloudflare'
  return RESEARCH_MODELS.find((model) => model.id === id)?.provider ?? 'nvidia'
}
