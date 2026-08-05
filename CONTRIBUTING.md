# Contributing

Thanks for helping with AgentChicago17B and `@heysalad/chicago`.

## Quick start

```bash
git clone https://github.com/Hey-Salad/AgentChicago17B.git
cd AgentChicago17B
npm install
npm test
npm run lint
npm run build
npm run chicago -- doctor
```

## What to work on

| Track | Where | Issue label |
| --- | --- | --- |
| Bugs | [BUG_LOG](docs/BUG_LOG.md) + issues | `bug` |
| Product | [PRODUCT_LOG](docs/PRODUCT_LOG.md) | `product`, `enhancement` |
| CLI package | `packages/cli/` | area in bug template |
| Security | [SECURITY.md](SECURITY.md) | advisory (private) |

## PR hygiene

1. One concern per PR when practical.
2. Run `npm test && npm run lint && npm run build` before asking for review.
3. If you touch `packages/cli/`, also run:
   ```bash
   node --check packages/cli/bin/chicago.mjs
   cd packages/cli && npm pack && npm publish --dry-run
   ```
4. Never commit `.env`, access codes, or API tokens.
5. User-facing CLI changes: note semver impact (`patch` / `minor` / `major`) in the PR body — see [RELEASE_TRAIN.md](docs/RELEASE_TRAIN.md).

## Commit messages

Prefer short, imperative subjects (`Add firebase.json for Hosting deploy`). Release commits for the CLI are cut by the release workflow as `release(@heysalad/chicago): vX.Y.Z`.

## Code of conduct

Be respectful. No harassment, no dumping secrets into issues, no drive-by force-pushes to `main`.
