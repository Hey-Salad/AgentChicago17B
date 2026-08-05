import { defineTool } from 'eve/tools'

/** Persist the finished brief into the durable sandbox workspace. */
export default defineTool({
  description:
    'Write the final synthesized research brief as Markdown under /workspace/briefs/. Call after Deliver + Critique.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['slug', 'title', 'markdown'],
    properties: {
      slug: { type: 'string', minLength: 1 },
      title: { type: 'string', minLength: 1 },
      markdown: { type: 'string', minLength: 40 },
    },
  },
  async execute(input, ctx) {
    const { slug, title, markdown } = input as {
      slug: string
      title: string
      markdown: string
    }
    const sandbox = await ctx.getSandbox()
    const path = `briefs/${slug}.md`
    const stamped = [
      `# ${title}`,
      '',
      `_AgentChicago17B · durable Eve session · ${new Date().toISOString()}_`,
      '',
      markdown,
      '',
      '---',
      '',
      '_One brief. Deep as the dish. — HeySalad_',
      '',
    ].join('\n')
    await sandbox.writeTextFile({ path, content: stamped })
    return { path: `/workspace/${path}`, bytes: stamped.length }
  },
})
