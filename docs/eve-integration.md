# Eve + Workflows + Sandbox integration

AgentChicago17B now ships a parallel **Eve** agent under `agent/`.

| Layer | What it does |
|-------|----------------|
| **Eve** | Filesystem-first durable agent (`agent/instructions.md`, tools, skills) |
| **Vercel Workflows** | Persist session turns; resume after cold starts / long gathers |
| **Vercel Sandbox** | Isolated microVM for `bash` / fetch / file notes (`agent/sandbox/`) |
| **Vite desk** | Existing branded UI (demo + live LLM proxy) — unchanged default path |

```mermaid
flowchart TB
  subgraph spa [Vite SPA]
    UI[Research desk]
    Admin[Admin → Eve desk]
  end
  subgraph eve [Eve runtime]
    Sess[Durable session / Workflows]
    Tools[Tools + skills]
    SB[Sandbox /workspace]
  end
  UI -->|classic pipeline| ViteProxy[/api/llm/chat]
  Admin -->|/eve/v1/session| Sess
  Sess --> Tools
  Tools --> SB
  SB -->|on Vercel| VS[Vercel Sandbox microVM]
```

## Install (required once)

Package installs were scaffolded in `package.json`. From the repo root:

```bash
npm install
# Eve recommends Node.js 24+
```

**Default model path is Cloudflare AI Gateway** (GLM 5.2). Full guide:
[eve-cloudflare.md](./eve-cloudflare.md). How to *describe* Eve backends (Gateway string vs LanguageModel): [eve-inference-providers.md](./eve-inference-providers.md).

```env
EVE_LLM_BACKEND=cloudflare
CF_ACCOUNT_ID=...
CF_API_TOKEN=...
CF_AIG_GATEWAY_ID=default
EVE_MODEL=@cf/zai-org/glm-5.2
```

Optional Vercel AI Gateway instead:

```env
EVE_LLM_BACKEND=vercel-gateway
AI_GATEWAY_API_KEY=...
EVE_MODEL=zai/glm-5.2
```

## Run locally (two terminals)

```bash
# Terminal A — durable Eve agent (Workflows + Sandbox)
npm run eve

# Terminal B — branded Chicago desk
npm run dev
```

Open the Vite app → **Admin → Eve desk** → start a session.

Classic research (composer on Deep research) still uses the Vite LLM proxy (Cloudflare / OpenRouter / NVIDIA). Eve is the durable path.

## Project layout (Eve)

```text
agent/
  agent.ts                 # defineAgent({ model })
  instructions.md          # always-on Chicago desk persona
  tools/
    persist_research_workspace.ts
    run_source_notes.ts      # fetch URL inside sandbox
    finalize_brief.ts
  skills/
    intent|gather|deliver|critique/SKILL.md
  sandbox/
    sandbox.ts               # defaultBackend → Vercel Sandbox on deploy
    workspace/               # seeded into /workspace
```

## Tools

| Tool | Role |
|------|------|
| `persist_research_workspace` | Seed `/workspace/notes/<slug>` |
| `run_source_notes` | Sandbox-fetch a URL → `/workspace/sources/...` |
| `finalize_brief` | Write finished Markdown under `/workspace/briefs/` |

Built-in Eve tools (`bash`, `read_file`, `write_file`, …) also target the sandbox.

## Deploy on Vercel

1. Deploy the Eve app (`npm run eve:build` / Eve’s Vercel guide).
2. Workflows persist sessions automatically on Vercel.
3. Sandbox uses **Vercel Sandbox** when `VERCEL` is set (`defaultBackend` in `agent/sandbox/sandbox.ts`).
4. Point `VITE_EVE_BASE_URL` at your hosted Eve origin (or same-origin `/eve` if routed together).

Tighten `networkPolicy` in `agent/sandbox/sandbox.ts` for production (today: `allow-all` for desk research).

## Security notes

- Authored tools run in the **app runtime** (can read `process.env`).
- Sandbox tools/commands run **isolated** — do not inject secrets into the sandbox; use credential brokering / allow-lists when possible.
- Keep the SPA access wall (`VITE_APP_ACCESS_CODE`) and/or Cloudflare Access in front of public URLs.

## Optional: scaffold refresh

If you want Eve’s CLI to reconcile deps later:

```bash
npx eve@latest init .
```

Only run this if you understand it may adjust scripts; this repo already contains a hand-authored `agent/` tree.
