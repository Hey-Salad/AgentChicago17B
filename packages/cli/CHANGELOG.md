# Changelog — `@heysalad/chicago`

## 0.1.1

### Security
- Stop shipping hardcoded Cloudflare account IDs as CLI defaults; resolve from `CLOUDFLARE_ACCOUNT_ID`, `--account-id`, or `wrangler.toml`.

### Added
- Deploy targets: `cloudflare` · `vercel` · `firebase` via platform CLIs (`npx`).
- Agent-oriented non-interactive help text and flags.
- `firebase.json` SPA hosting defaults when missing.

## 0.1.0

- Initial public release on npm as `@heysalad/chicago`.
- Commands: `scaffold`, `onboard` / `init`, `configure`, `provision`, `deploy`, `doctor`.
