# Security Policy

## Supported versions

| Component | Version | Supported |
| --- | --- | --- |
| `@heysalad/chicago` (npm) | latest `0.x` | ✅ |
| AgentChicago17B app / Worker | `main` | ✅ |

## Reporting a vulnerability

**Do not open a public GitHub issue** for secrets, auth bypasses, or RCE-style bugs.

1. Use [GitHub Security Advisories](https://github.com/Hey-Salad/AgentChicago17B/security/advisories/new) for this repo, or
2. Email the maintainers listed in the npm package / org profile.

Include: affected version, repro (redacted), impact, and whether a fix is already known.

We aim to acknowledge within 5 business days.

## What counts as sensitive

- Access codes (`ACCESS_CODE`, `VITE_APP_ACCESS_CODE`)
- Cloudflare / Vercel / Firebase / OpenRouter / NVIDIA tokens
- `.env`, `.dev.vars`, Wrangler secrets, private keys
- Session tokens and D1 dumps from production

Resource IDs in `wrangler.toml` (D1/KV/R2 ids, account_id) are **not** secrets by themselves, but treat production Worker URLs and access codes as confidential.

## Package consumers (`@heysalad/chicago`)

- Prefer `npx @heysalad/chicago@x.y.z` pinning in agent scripts once you depend on behavior.
- Never pass secrets on the shell history when avoidable — use env vars (`CLOUDFLARE_API_TOKEN`, `ACCESS_CODE`) or `wrangler secret put`.
- The CLI refuses to bake a default Cloudflare account into published builds; set `CLOUDFLARE_ACCOUNT_ID` or `wrangler.toml`.
- CI packs the tarball and fails the job if private-key material is detected.

## Supply chain

Releases of `@heysalad/chicago` are intended to publish with **npm provenance** from GitHub Actions (`release-chicago` workflow). Verify:

```bash
npm view @heysalad/chicago dist.tarball
npm audit --omit=dev
```

GitHub Release assets attach the same `.tgz` built in CI. Prefer installing from npmjs; GitHub Packages mirror is `@hey-salad/chicago` (org scope).
