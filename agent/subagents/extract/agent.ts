import { defineAgent } from 'eve'

export default defineAgent({
  description:
    'Step 6 · Extract — pull claims, evidence, conflicts, and gaps from gathered sources.',
  model: process.env.EVE_MODEL || 'zai/glm-5.2',
})
