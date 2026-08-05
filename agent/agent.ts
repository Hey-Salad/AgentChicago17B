import { defineAgent } from 'eve'

/**
 * Durable AgentChicago17B on Eve.
 * String model → Vercel AI Gateway (OIDC on Vercel / AI_GATEWAY_API_KEY locally).
 * For Cloudflare Workers AI locally, set EVE_LLM_BACKEND=cloudflare and see agent/lib/model.ts.
 */
export default defineAgent({
  model: process.env.EVE_MODEL || 'zai/glm-5.2',
})
