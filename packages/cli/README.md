# @heysalad/chicago

CLI to scaffold, configure, and deploy an [AgentChicago17B](https://github.com/Hey-Salad/AgentChicago17B) desk research agent.

## Try it

```bash
npx @heysalad/chicago scaffold
cd agentchicago17b
npm install
npx @heysalad/chicago onboard
```

## Deploy targets

The CLI shells out to the platform CLIs you already use (via `npx` when not on PATH):

| `--target` | What runs |
| --- | --- |
| `cloudflare` | `npm run build` → `wrangler deploy` (full Worker + D1/KV/R2) |
| `vercel` | `npm run build` → `vercel deploy dist --prod --yes` |
| `firebase` | `npm run build` → `firebase deploy --only hosting` |
| `local` | nothing to push — `npm run dev` |

```bash
npx @heysalad/chicago deploy --target cloudflare --yes
npx @heysalad/chicago deploy --target vercel --yes
npx @heysalad/chicago deploy --target firebase --yes --project YOUR_FB_PROJECT
```

Vercel / Firebase ship the **static SPA**. Live LLM + sessions on those hosts still need API routes (see the repo README). Cloudflare is the full data-plane path today.

## Agent / Codex / Claude install

Non-interactive so coding agents can bootstrap an instance:

```bash
npx @heysalad/chicago scaffold my-agent
cd my-agent && npm install
npx @heysalad/chicago onboard --non-interactive --accept-risk \
  --target cloudflare --access-code YOUR_CODE
npx @heysalad/chicago provision
npx @heysalad/chicago deploy --target cloudflare --yes
```

Flags: `--flow`, `--auth`, `--inference`, `--target`, `--access-code`, `--account-id`, `--with-eve`, `--force`, `--yes`, `--vercel-token`, `--project`.

## Commands

| Command | What it does |
| --- | --- |
| `scaffold [dir]` | Clone the AgentChicago17B template |
| `onboard` / `init` | Wizard (auth, inference, deploy target) |
| `configure` | Patch `.env` / access code |
| `provision` | Create Cloudflare D1 / KV / R2 / Vectorize |
| `deploy` | Build + deploy to chosen target |
| `doctor` | Sanity-check the instance |

## Scoped package note

Unscoped `chicago` is taken on npm. This package is `@heysalad/chicago` with `publishConfig.access: "public"`.

## Docs

- [NPM publish playbook](https://github.com/Hey-Salad/AgentChicago17B/blob/main/docs/npm-publish.md)
- [CLI guide](https://github.com/Hey-Salad/AgentChicago17B/blob/main/docs/chicago-cli.md)

## License

MIT
