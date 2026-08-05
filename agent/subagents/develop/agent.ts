import { defineAgent } from 'eve'

export default defineAgent({
  description:
    'Step 4 · Develop — propose 3–5 distinct, searchable research angles for the defined challenge.',
  model: process.env.EVE_MODEL || 'zai/glm-5.2',
})
