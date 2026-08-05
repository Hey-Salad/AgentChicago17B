# Release train — `@heysalad/chicago`

Incremental releases without breaking consumers.

## Principles

1. **Main stays green** — `ci.yml` runs test / lint / build / CLI pack hygiene on every PR and push to `main`.
2. **Publish is intentional** — merging to `main` does **not** publish. A human (or agent with approval) starts the train.
3. **Semver means something**
   - **patch** — bugfix, docs in the package, security hardening, no flag changes
   - **minor** — new commands / flags / deploy targets, backward compatible
   - **major** — removed flags, changed defaults that break scripts, auth behavior changes
4. **One artifact, three homes** — same tarball → npmjs `@heysalad/chicago`, GitHub Release asset, and (when org package permissions allow) GitHub Packages `@hey-salad/chicago`.

## How to cut a release

### A. From GitHub UI (preferred)

1. Actions → **release-chicago** → **Prepare release (bump + tag)**
2. Choose `patch` / `minor` / `major`
3. Optionally set **dry_run** to only bump + draft notes locally in the prepare job (no tag push)
4. Approve / watch the follow-up **Publish** run on the new tag

### B. From a tag

```bash
# after bumping packages/cli/package.json on main
git tag -a chicago-cli-v0.1.1 -m "Chicago CLI 0.1.1"
git push origin chicago-cli-v0.1.1
```

Tag must match `packages/cli/package.json` version.

### Required secrets / settings

| Name | Where | Purpose |
| --- | --- | --- |
| `NPM_TOKEN` | Repo → Settings → Secrets | Automation token with publish to `@heysalad` on npmjs |
| `GITHUB_TOKEN` | Automatic | Releases + (with org **Packages** write) GitHub Packages mirror |
| Packages write | Org/repo Actions permissions | Enable “Read and write” for workflows + allow `GITHUB_TOKEN` to publish packages |

First-time npm: `npm token create` (classic automation) while logged in as an `@heysalad` org member.

## Agent / Codex install (pin versions)

```bash
npx @heysalad/chicago@0.1.1 scaffold my-agent
```

Prefer an exact version in automation so a minor train cannot surprise you mid-script.

## Compatibility contract

Until `1.0.0`:

- `scaffold` / `onboard` / `configure` / `provision` / `deploy` / `doctor` stay available
- `--non-interactive --accept-risk` remains the agent entrypoint
- `--target cloudflare|vercel|firebase` may gain values (minor), not silently change meaning (major)

## Rollback

npm does not allow reusing a version. If a bad release ships:

1. `npm deprecate @heysalad/chicago@X.Y.Z "reason"`
2. Cut a patch with the fix
3. Update the GitHub Release notes on the bad tag

## Related

- [SECURITY.md](../SECURITY.md)
- [packages/cli/CHANGELOG.md](../packages/cli/CHANGELOG.md)
- [docs/BUG_LOG.md](BUG_LOG.md) · [docs/PRODUCT_LOG.md](PRODUCT_LOG.md)
