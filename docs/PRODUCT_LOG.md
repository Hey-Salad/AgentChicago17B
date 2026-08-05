# Product log

Decisions and feature proposals for AgentChicago17B and `@heysalad/chicago`. Detailed debate lives in issues labeled `product` / `enhancement`; this file is the changelog of **intent**.

| Date | Decision | Train impact | Link |
| --- | --- | --- | --- |
| 2026-08-05 | Ship CLI as `@heysalad/chicago` (not `ac17b`) | minor (0.1.0) | npm |
| 2026-08-05 | Multi-target deploy: Cloudflare · Vercel · Firebase | minor | CLI |
| 2026-08-05 | Release train via GitHub Actions (no publish-on-merge) | — | [RELEASE_TRAIN.md](RELEASE_TRAIN.md) |
| 2026-08-05 | Remove hardcoded CF account menu from published CLI | patch | SECURITY |

## How to propose

1. Open a **Product / feature request** issue.
2. Maintainers triage → add a row here when accepted, deferred, or rejected.
3. Implementation PRs reference the product-log date or issue number.

## North star (short)

- Desk research agent that is easy to self-host.
- CLI an agent (Claude / Codex) can drive non-interactively.
- Cloudflare = full data plane; Vercel / Firebase = static SPA path first.
