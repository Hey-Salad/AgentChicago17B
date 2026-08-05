import { experimental_workflow } from 'eve/tools'

/** Orchestrate the 8 research subagents as one durable Workflow step. */
export default experimental_workflow({ maxSubagents: 16 })
