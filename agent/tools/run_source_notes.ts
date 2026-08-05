import { defineTool } from 'eve/tools'

/** Fetch a URL inside the Eve sandbox and save notes. */
export default defineTool({
  description:
    'Fetch a public URL inside the isolated sandbox and save a text notes file under /workspace/sources. Never invent URLs.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['url', 'slug', 'title'],
    properties: {
      url: { type: 'string', format: 'uri' },
      slug: { type: 'string', minLength: 1 },
      title: { type: 'string', minLength: 1 },
      note: { type: 'string' },
    },
  },
  async execute(input, ctx) {
    const { url, slug, title, note } = input as {
      url: string
      slug: string
      title: string
      note?: string
    }
    const sandbox = await ctx.getSandbox()
    const safeName =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'source'
    const path = `sources/${slug}/${safeName}.txt`
    const result = await sandbox.run({
      command: `python3 - <<'PY'
import urllib.request
url = ${JSON.stringify(url)}
try:
    req = urllib.request.Request(url, headers={"User-Agent": "AgentChicago17B/0.1"})
    with urllib.request.urlopen(req, timeout=20) as res:
        raw = res.read(120_000)
    text = raw.decode("utf-8", errors="replace")
    print(text[:8000])
except Exception as e:
    print(f"FETCH_ERROR: {e}")
PY`,
    })
    const body = (result.stdout || '').trim()
    const content = [
      `Title: ${title}`,
      `URL: ${url}`,
      note ? `Note: ${note}` : null,
      '',
      '--- excerpt ---',
      body.slice(0, 6000),
      '',
    ]
      .filter(Boolean)
      .join('\n')
    await sandbox.writeTextFile({ path, content })
    return {
      path: `/workspace/${path}`,
      ok: !body.startsWith('FETCH_ERROR:'),
      preview: body.slice(0, 400),
    }
  },
})
