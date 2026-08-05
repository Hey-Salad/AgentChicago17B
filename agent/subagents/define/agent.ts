import { defineAgent } from 'eve'

export default defineAgent({
  description:
    'Step 3 · Define — reframe one clear challenge with boundaries and success criteria.',
  model: process.env.EVE_MODEL || 'zai/glm-5.2',
})
