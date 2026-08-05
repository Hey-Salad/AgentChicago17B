import { defineAgent } from 'eve'

export default defineAgent({
  description:
    'Step 1 · Intent — decide if the research ask is clear; ask 1–3 clarifying questions if vague.',
  model: process.env.EVE_MODEL || 'zai/glm-5.2',
})
