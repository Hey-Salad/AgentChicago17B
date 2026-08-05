# Installation guide — AgentChicago17B

HeySalad open-source desk research agent.

## Requirements

- **Node.js 20+**
- npm 10+ (ships with Node)
- Optional: Cloudflare Workers AI key, OpenRouter key, and/or NVIDIA Build key
- Optional: Tavily key for live web sources

## 1. Clone

```bash
git clone https://github.com/Hey-Salad/AgentChicago17B.git
cd AgentChicago17B
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Minimum for a private local desk:

```env
VITE_AUTH_REQUIRED=true
VITE_APP_ACCESS_CODE=choose-a-strong-shared-code
```

Pick **one** LLM path (or configure several and switch in the model picker):

| Path | Variables | Docs |
|------|-----------|------|
| Cloudflare Workers AI | `VITE_CF_API_KEY`, `VITE_CF_BASE_URL` | [cloudflare-setup.md](./cloudflare-setup.md) |
| OpenRouter | `VITE_OPENROUTER_API_KEY` | [openrouter-setup.md](./openrouter-setup.md) |
| NVIDIA Build | `VITE_LLM_API_KEY`, `VITE_LLM_BASE_URL` | README env section |

Demo mode still works with **no** LLM keys (offline / fallback briefs).

## 3. Run

```bash
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

1. Unlock with your access code (or use **Local only — continue without code** in development)
2. Ask a research question
3. Share the brief as **PDF** / **Email** / Markdown

## 4. Useful scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | App + `/api/llm/chat` + STT proxy |
| `npm test` | Regression harness |
| `npm run build` | Production `dist/` |
| `npm run lint` | oxlint |

## 5. Production notes

- Put **Cloudflare Access** (or another IdP) in front of the hosted UI for real SSO — see [auth-and-sharing.md](./auth-and-sharing.md)
- Live LLM needs a server-side `/api/llm/chat` adapter (Vite proxy is local-only)
- Never commit `.env`

## Next reading

- [architecture.md](./architecture.md) — pipeline diagrams
- [cloudflare-setup.md](./cloudflare-setup.md)
- [openrouter-setup.md](./openrouter-setup.md)
- [auth-and-sharing.md](./auth-and-sharing.md)
- [`../prompts/`](../prompts/) — clone-and-adjust skill prompts
