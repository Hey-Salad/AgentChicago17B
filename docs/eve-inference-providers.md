# Eve inference providers — how to describe them

Classic desk research (`RESEARCH_MODELS`) and Eve **do not share the same provider model**. Mixing the two in one picker causes wrong IDs, wrong env vars, and wrong “free tier” claims.

## Two shapes Eve accepts

Eve’s `defineAgent({ model })` accepts **exactly one** of:

| Shape | Type | Routes through | Auth |
|-------|------|----------------|------|
| **A. Gateway string** | `string` | [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) | OIDC on Vercel, or `AI_GATEWAY_API_KEY` locally |
| **B. LanguageModel** | AI SDK `LanguageModel` | Direct provider / OpenAI-compatible base URL | That provider’s key |

```ts
// A — gateway string (Eve default style)
defineAgent({ model: 'zai/glm-5.2' })

// B — direct LanguageModel (Cloudflare, Anthropic SDK, etc.)
defineAgent({ model: createCloudflareGatewayModel() })
```

There is no third shape. An `@cf/...` id is **not** a valid Gateway string; it only works as part of a Cloudflare `LanguageModel` (shape B).

## Provider catalog (descriptive)

Describe each Eve option with these fields:

| Field | Meaning |
|-------|---------|
| `id` | Stable catalog key (`vercel-gateway:zai/glm-5.2`, `cloudflare:glm-5.2`) |
| `backend` | `vercel-gateway` \| `cloudflare` (extend later: `openrouter`, `anthropic`, …) |
| `label` | Human name in Admin / docs |
| `modelRef` | What you put in `EVE_MODEL` / pass to the SDK |
| `shape` | `gateway-string` \| `language-model` |
| `env` | Required env vars |
| `when` | Local vs Vercel default |
| `notes` | Cost / free-tier / Paid-only caveats |

### Current backends

#### 1. Vercel AI Gateway (`backend: vercel-gateway`)

- **Shape:** `gateway-string`
- **Model ref examples:** `zai/glm-5.2`, `anthropic/claude-sonnet-4.6`, `openai/gpt-5.4-mini`
- **Env:** `EVE_LLM_BACKEND=vercel-gateway`, optional `AI_GATEWAY_API_KEY`, `EVE_MODEL=…`
- **Default when:** `VERCEL=1`, or no Cloudflare credentials locally
- **Notes:** One string swaps providers; usage/policy live in Gateway. Not Cloudflare Neurons.

#### 2. Cloudflare AI Gateway / Workers AI (`backend: cloudflare`)

- **Shape:** `language-model` (OpenAI-compatible client in `agent/lib/model.ts`)
- **Model ref examples:**
  - REST: `@cf/zai-org/glm-5.2`
  - Compat URL: `workers-ai/@cf/zai-org/glm-5.2`
- **Env:** `EVE_LLM_BACKEND=cloudflare`, `CF_ACCOUNT_ID`, `CF_API_TOKEN` (or `VITE_CF_*`), `EVE_MODEL=…`
- **Default when:** Local + Cloudflare credentials present
- **Notes:** GLM 5.2 is Workers **Paid**. Free Neurons work for Llama 3.3 / 3.2 etc. Eve process still runs on Node — Cloudflare is inference only.

### Not wired yet (future catalog rows)

| Backend | Shape | Why useful |
|---------|-------|------------|
| OpenRouter | `language-model` or Gateway if listed | Same multi-model story as classic desk |
| Anthropic / OpenAI direct | `language-model` via `@ai-sdk/*` | Provider-native options / reasoning controls |
| NVIDIA Build | `language-model` (OpenAI-compatible) | Free-tier experiments |

Prefer **Gateway strings** on Vercel. Prefer **LanguageModel** when you must hit Cloudflare (or another base URL) without Gateway.

## vs classic desk (`RESEARCH_MODELS`)

| | Classic Vite desk | Eve |
|--|-------------------|-----|
| Runtime | Browser → `/api/llm/chat` proxy | Node Eve server |
| Provider field | `cloudflare` \| `openrouter` \| `nvidia` | `vercel-gateway` \| `cloudflare` (+ later) |
| Model id style | `@cf/…`, `openrouter/…`, `meta/…` | Gateway `vendor/model` **or** CF `@cf/…` inside LanguageModel |
| Picker | Composer `ModelPicker` | Env / Admin Eve desk (not the classic picker) |
| Free-tier notes | Neurons / OR `:free` / NVIDIA Build | Gateway credits vs CF Neurons — **never mix** |

## Resolution policy (code)

`agent/lib/model.ts` → `resolveEveModel()`:

1. `EVE_LLM_BACKEND=cloudflare` → LanguageModel (Cloudflare)
2. `EVE_LLM_BACKEND=vercel-gateway` **or** `VERCEL=1` → Gateway string
3. Else if CF creds exist → Cloudflare LanguageModel
4. Else → Gateway string (`EVE_MODEL` or `zai/glm-5.2`)

`agent/agent.ts` should call `resolveEveModel()` so docs, Admin status, and runtime agree.

## UI / Admin copy checklist

When showing Eve inference status:

1. Name the **backend** (`Vercel AI Gateway` vs `Cloudflare Workers AI`)
2. Show the **model ref** actually resolved
3. Show the **shape** (string vs LanguageModel) only in Advanced / docs
4. Never reuse classic `freeNote` text for Eve — Gateway ≠ Neurons

## Related

- [eve-integration.md](./eve-integration.md) — run both paths
- [eve-cloudflare.md](./eve-cloudflare.md) — Cloudflare setup
- [eve-vercel-8step.md](./eve-vercel-8step.md) — production Gateway default
- Classic catalog: `src/agent/models.ts`
