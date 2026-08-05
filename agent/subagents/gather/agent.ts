import { defineAgent } from 'eve'

export default defineAgent({
  description:
    'Step 5 · Gather — collect secondary sources (sandbox fetch). Never invent URLs.',
  model: process.env.EVE_MODEL || 'zai/glm-5.2',
})
