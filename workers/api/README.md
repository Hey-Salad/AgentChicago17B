# Cloudflare Worker API

Production data plane for AgentChicago17B:

- Auth adapters (`access-code`, `cf-access`, `oauth`, `anonymous`)
- D1 sessions / messages / briefs / memory / share links
- KV synthesis cache
- R2 brief blobs
- Vectorize RAG (+ Workers AI embeddings)
- `/api/llm/chat` provider proxy

## Local

```bash
# SPA + in-memory API shim (no Wrangler)
npm run dev

# Full Worker (requires wrangler + binding ids)
npx wrangler d1 migrations apply agentchicago17b --local
npx wrangler dev
```

## Deploy

```bash
npm run build
npx wrangler deploy
# or
npm run chicago -- deploy
```

Update placeholder ids in [`wrangler.toml`](../../wrangler.toml) after creating D1/KV/R2/Vectorize resources.
