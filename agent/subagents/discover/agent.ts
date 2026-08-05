import { defineAgent } from 'eve'

export default defineAgent({
  description:
    'Step 2 · Discover — expand context: stakeholders, constraints, adjacent questions, what good looks like.',
  model: process.env.EVE_MODEL || 'zai/glm-5.2',
})
