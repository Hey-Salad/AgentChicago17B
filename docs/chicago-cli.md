# chicago CLI — onboard like OpenClaw

Guided install for an AgentChicago17B research-agent instance.

```bash
npm run chicago -- onboard
# aliases
npm run chicago -- init

# after publishing @heysalad/chicago
npx @heysalad/chicago scaffold
npx @heysalad/chicago onboard
```

## What the wizard asks

Inspired by [OpenClaw onboard](https://docs.openclaw.ai/cli/onboard):

1. **Security notice** — acknowledge agent / deploy risk (`--accept-risk` for scripts)
2. **QuickStart vs Advanced** — defaults vs full control
3. **Detection** — reads existing `.env` / process env for CF / OpenRouter / NVIDIA keys
4. **Numbered menus** — auth mode, inference provider, deploy target
5. **Secrets** — access code + provider keys (optional blanks → configure later)
6. **Eve** (Advanced) — optional durable sidecar notes
7. **Doctor** — optional health check at the end

### QuickStart defaults

| Setting | Value |
|---------|--------|
| Auth | `access-code` |
| Inference | detected key, else Cloudflare |
| Deploy | local (`npm run dev`) |
| Eve | skip |

### Advanced

Full choice of auth (`access-code` · `cf-access` · `oauth` · `anonymous`), inference, Tavily, Eve, and **local vs Cloudflare** deploy target.

## Commands

| Command | Purpose |
|---------|---------|
| `chicago onboard` | Interactive wizard |
| `chicago configure` | Re-prompt secrets / `--access-code` / `--set KEY=VAL` |
| `chicago provision` | Create D1 / KV / R2 / Vectorize via Wrangler |
| `chicago deploy [--target …]` | Build + deploy via wrangler / vercel / firebase |
| `chicago doctor` | File + env + CLI + `/api/health` checks |

### Deploy targets

```bash
npm run chicago -- deploy --target cloudflare --yes
npm run chicago -- deploy --target vercel --yes
npm run chicago -- deploy --target firebase --yes --project YOUR_FB_PROJECT
```

### Agent / non-interactive

```bash
npx @heysalad/chicago scaffold my-agent
cd my-agent && npm install
npx @heysalad/chicago onboard --non-interactive --accept-risk \
  --target cloudflare --access-code YOUR_CODE
npx @heysalad/chicago deploy --target cloudflare --yes
```

## Non-interactive

```bash
npm run chicago -- onboard --non-interactive --accept-risk \
  --auth access-code --access-code secret \
  --inference cloudflare --target local --force
```

## After onboard (Cloudflare)

```bash
npm run chicago -- provision
npx wrangler secret put ACCESS_CODE
npx wrangler secret put CF_API_TOKEN
# paste ids from provision output into wrangler.toml if needed
npm run chicago -- deploy
npm run chicago -- doctor --url https://YOUR_WORKER.workers.dev
```

See [product-map.md](./product-map.md) and [auth-modes.md](./auth-modes.md).
