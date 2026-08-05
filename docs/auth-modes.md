# Auth modes — selectable adapters

One SPA + one Worker. Auth is a **deploy-time adapter**, not four app forks.

Set the same mode on both sides:

```env
# SPA
VITE_AUTH_MODE=access-code

# Worker (wrangler secret / var)
AUTH_MODE=access-code
```

| Mode | Audience | SPA | Worker |
|------|----------|-----|--------|
| `access-code` | Team / OSS demo | Shared code gate ([AuthGate](../src/components/AuthGate.tsx)) | `Authorization: Bearer <code>` or `X-Access-Code` |
| `cf-access` | Enterprise Zero Trust | Gate off (`VITE_AUTH_REQUIRED=false`); CF Access in front | Validate `Cf-Access-Jwt-Assertion` |
| `oauth` | Multi-user product | OAuth redirect / session cookie | Cookie or Bearer session; rows scoped by `user_id` |
| `anonymous` | Public demo | Device id in `localStorage` | `X-Device-Id`; optional share tokens |

## Contract

Each adapter implements:

```ts
type AuthMode = 'access-code' | 'cf-access' | 'oauth' | 'anonymous'

interface AuthContext {
  mode: AuthMode
  userId: string | null
  workspaceId: string
  deviceId?: string
}

// Worker middleware → AuthContext | 401
```

CLI `chicago init` prompts **Which auth mode?** and writes env + Wrangler vars.

## Mode details

### access-code (default)

- Secret: `ACCESS_CODE` on the Worker (`wrangler secret put ACCESS_CODE`)
- Optional local: `VITE_APP_ACCESS_CODE` in `.env` for faster local compare
- **Cloud deploys:** leave `VITE_APP_ACCESS_CODE` empty at build time. The SPA calls `POST /api/auth/verify` so the code is **not** baked into JavaScript.
- After unlock, API requests send `X-Access-Code` / `Authorization: Bearer`

### cf-access

- `VITE_AUTH_REQUIRED=false` (Access handles the browser wall)
- Worker validates JWT with team domain / AUD tags (`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`)
- Stub in v1 returns 501 until certs are configured — interface is ready

### oauth

- Provider: GitHub or Google (`OAUTH_PROVIDER`, client id/secret)
- Sets httpOnly session cookie
- Stub in v1 returns 501 with setup instructions

### anonymous

- Client generates `device_id`, sends `X-Device-Id`
- Sessions scoped to device; share links unlock read-only briefs

## SPA selection

`VITE_AUTH_MODE` drives which gate UI mounts. Unknown/missing mode falls back to `access-code` when `VITE_AUTH_REQUIRED=true`.

## Related

- [product-map.md](./product-map.md)
- Worker: `workers/api/src/auth/`
- SPA: `src/auth/`
