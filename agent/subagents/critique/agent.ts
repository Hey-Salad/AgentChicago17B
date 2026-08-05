import { defineAgent } from 'eve'

export default defineAgent({
  description:
    'Step 8 · Critique — independent QA of the brief; request one rewrite if NEEDS_WORK.',
  model: process.env.EVE_MODEL || 'zai/glm-5.2',
})
