import { defineAgent } from 'eve'
import { resolveEveModel } from './lib/model'

/**
 * Durable AgentChicago17B on Eve.
 *
 * model shape:
 * - string → Vercel AI Gateway id (e.g. zai/glm-5.2)
 * - LanguageModel → direct provider (Cloudflare OpenAI-compatible, etc.)
 *
 * Resolution: agent/lib/model.ts · catalog: agent/lib/providers.ts
 * Docs: docs/eve-inference-providers.md
 */
export default defineAgent({
  model: resolveEveModel(),
})
