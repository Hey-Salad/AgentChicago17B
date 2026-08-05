# Publishing `@heysalad/chicago`

Playbook distilled from [JunoGuard](https://www.npmjs.com/package/@heysalad/junoguard) plus the AgentChicago17B **release train**.

## Registries

| Registry | Package | Notes |
| --- | --- | --- |
| npmjs | [`@heysalad/chicago`](https://www.npmjs.com/package/@heysalad/chicago) | Primary — `npx @heysalad/chicago` |
| GitHub Releases | [`chicago-cli-v*`](https://github.com/Hey-Salad/AgentChicago17B/releases) | Attaches the `.tgz` built for that version |
| GitHub Packages | `@hey-salad/chicago` | Mirror via release workflow (`packages: write` on `GITHUB_TOKEN` / org package permissions) |

Do **not** publish by hand for routine trains — use [RELEASE_TRAIN.md](RELEASE_TRAIN.md).

## Why `@heysalad/chicago`

| Name | Status |
| --- | --- |
| `chicago` (unscoped) | **Taken** |
| `@heysalad/chicago` | Public on npmjs |
| `@hey-salad/chicago` | GitHub Packages mirror (org name) |

## Package shape

Thin folder `packages/cli/`:

- `bin/chicago.mjs`
- `publishConfig.access: "public"` + provenance from Actions
- `files: ["bin", "README.md", "CHANGELOG.md"]`
- No `.env`, no Wrangler secrets, no hardcoded account menus

## Manual emergency publish

```bash
cd packages/cli
npm whoami
npm pack
npm publish --access public --provenance   # needs OIDC on Actions; local may omit --provenance
```

Confirm with curl (avoid stale `npm view` 404 cache):

```bash
curl -s https://registry.npmjs.org/@heysalad%2Fchicago | head
```

## Secrets

Repo secret `NPM_TOKEN` (automation) required for the publish job. Never commit tokens.
