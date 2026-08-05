import { checkEveHealth } from '../eve/client'

export type IntegrationStatus = 'ready' | 'missing' | 'error' | 'demo'

export interface IntegrationCard {
  id: string
  name: string
  path: string
  role: string
  status: IntegrationStatus
  detail: string
  freeNote?: string
  docsHref?: string
}

function hasEnv(key: keyof ImportMetaEnv): boolean {
  const v = import.meta.env[key]
  return typeof v === 'string' && v.trim().length > 0
}

export function classicIntegrations(): IntegrationCard[] {
  const cf = hasEnv('VITE_CF_API_KEY') && hasEnv('VITE_CF_BASE_URL')
  const or =
    hasEnv('VITE_OPENROUTER_API_KEY') ||
    (hasEnv('VITE_LLM_API_KEY') &&
      (import.meta.env.VITE_LLM_BASE_URL || '').includes('openrouter'))
  const nvidia =
    hasEnv('VITE_LLM_API_KEY') &&
    !(import.meta.env.VITE_LLM_BASE_URL || '').includes('openrouter')
  const tavily = hasEnv('VITE_TAVILY_API_KEY')
  const whisper = cf // same CF token powers STT proxy

  return [
    {
      id: 'cloudflare',
      name: 'Cloudflare Workers AI',
      path: 'Path A · Classic',
      role: 'LLM via Vite proxy (`@cf/…`)',
      status: cf ? 'ready' : import.meta.env.DEV ? 'demo' : 'missing',
      detail: cf
        ? 'API key + account base URL configured.'
        : 'Set VITE_CF_API_KEY and VITE_CF_BASE_URL.',
      freeNote:
        'Free: 10k Neurons/day. GLM 5.2 needs Workers Paid; use Llama 3.3 70B or 3.2 3B on Free.',
      docsHref: 'docs/cloudflare-setup.md',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      path: 'Path A · Classic',
      role: 'Multi-provider router',
      status: or ? 'ready' : 'missing',
      detail: or
        ? 'OpenRouter key configured.'
        : 'Set VITE_OPENROUTER_API_KEY for Claude / GPT / Llama via OR.',
      freeNote: 'Try openrouter/auto or models with a `:free` suffix when available.',
      docsHref: 'docs/openrouter-setup.md',
    },
    {
      id: 'nvidia',
      name: 'NVIDIA Build',
      path: 'Path A · Classic',
      role: 'LLM via integrate.api.nvidia.com',
      status: nvidia && !or ? 'ready' : nvidia ? 'ready' : 'missing',
      detail:
        nvidia || hasEnv('VITE_LLM_API_KEY')
          ? 'NVIDIA / generic LLM key present (check VITE_LLM_BASE_URL).'
          : 'Set VITE_LLM_API_KEY for NVIDIA Build.',
      freeNote: 'Best free-tier pick: meta/llama-3.1-8b-instruct. GLM 5.2 often times out.',
    },
    {
      id: 'tavily',
      name: 'Tavily search',
      path: 'Path A · Gather',
      role: 'Live web sources',
      status: tavily ? 'ready' : 'missing',
      detail: tavily
        ? 'Live search enabled when Sources → Web search is on.'
        : 'Optional. Without it, briefs use model knowledge only.',
      freeNote: 'Tavily has its own free trial / credits — not Cloudflare Neurons.',
    },
    {
      id: 'whisper',
      name: 'Whisper STT',
      path: 'Path A · Voice',
      role: 'Mic → text via CF Whisper',
      status: whisper ? 'ready' : 'missing',
      detail: whisper
        ? 'Speech proxy ready (Cloudflare Whisper).'
        : 'Needs the same Cloudflare Workers AI credentials.',
    },
  ]
}

export async function eveIntegration(): Promise<IntegrationCard> {
  const base = (import.meta.env.VITE_EVE_BASE_URL || '/eve').replace(/\/$/, '')
  try {
    const health = await checkEveHealth()
    if (health.ok) {
      return {
        id: 'eve',
        name: 'Eve (durable)',
        path: 'Path B · Vercel / local',
        role: 'Workflows + Sandbox · 8 subagents',
        status: 'ready',
        detail: `Healthy at ${base}${health.workflowId ? ` · ${health.workflowId}` : ''}`,
        freeNote:
          'Uses Vercel AI Gateway (zai/glm-5.2). Not the Cloudflare Free Neurons pool — needs Gateway/OIDC credits.',
        docsHref: 'docs/eve-vercel-8step.md',
      }
    }
    return {
      id: 'eve',
      name: 'Eve (durable)',
      path: 'Path B · Vercel / local',
      role: 'Workflows + Sandbox · 8 subagents',
      status: 'error',
      detail: health.error || 'Eve health check failed.',
      freeNote: 'Run `npm run eve` locally or use the Vercel deploy.',
      docsHref: 'docs/eve-integration.md',
    }
  } catch (err) {
    return {
      id: 'eve',
      name: 'Eve (durable)',
      path: 'Path B · Vercel / local',
      role: 'Workflows + Sandbox · 8 subagents',
      status: 'error',
      detail: err instanceof Error ? err.message : 'Eve unreachable',
      freeNote: 'Run `npm run eve` or point VITE_EVE_BASE_URL at production.',
      docsHref: 'docs/eve-integration.md',
    }
  }
}
