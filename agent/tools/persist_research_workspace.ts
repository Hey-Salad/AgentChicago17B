import { defineTool } from 'eve/tools'

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'research'
  )
}

/** Seed a durable /workspace folder for one research question. */
export default defineTool({
  description:
    'Create a research workspace folder under /workspace/notes for the current question. Call this once before gathering sources.',
  // Plain JSON Schema (avoid Zod Standard Schema mismatch during eve build)
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['query'],
    properties: {
      query: { type: 'string', minLength: 3, description: 'The research question' },
      reframed: { type: 'string', description: 'Optional reframed challenge' },
    },
  },
  async execute(input, ctx) {
    const query = String((input as { query?: string }).query || '')
    const reframed = (input as { reframed?: string }).reframed
    const slug = `${slugify(query)}-${Date.now().toString(36)}`
    const sandbox = await ctx.getSandbox()
    const base = `notes/${slug}`
    await sandbox.run({ command: `mkdir -p ${base} sources/${slug}` })
    await sandbox.writeTextFile({
      path: `${base}/query.md`,
      content: `# Research question\n\n${query}\n\n## Reframed\n\n${reframed || '_pending_'}\n`,
    })
    await sandbox.writeTextFile({
      path: `${base}/angles.md`,
      content: `# Research angles\n\n- _add angles here_\n`,
    })
    await sandbox.writeTextFile({
      path: `${base}/extracts.md`,
      content: `# Extracts\n\n`,
    })
    return {
      slug,
      notesDir: `/workspace/${base}`,
      sourcesDir: `/workspace/sources/${slug}`,
      message: 'Workspace ready.',
    }
  },
})
