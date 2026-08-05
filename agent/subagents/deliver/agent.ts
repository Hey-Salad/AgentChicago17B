import { defineAgent } from 'eve'

export default defineAgent({
  description:
    'Step 7 · Deliver — synthesize ONE Chicago-cited research brief from prior step outputs.',
  model: process.env.EVE_MODEL || 'zai/glm-5.2',
})
