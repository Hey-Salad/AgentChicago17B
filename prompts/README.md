# Clone-and-adjust prompts

These markdown files mirror the **default skill prompts** shipped in
`src/admin/skillStore.ts`. Copy them into your fork, edit the wording, then
either:

1. Paste into **Admin → Edit prompts** in the running app (saved to localStorage), or
2. Replace the matching `prompt:` string in `DEFAULT_SKILLS` and redeploy.

| File | Skill | Job |
|------|-------|-----|
| [01-intent.md](./01-intent.md) | Intent | Clarify vague asks before cooking |
| [02-discover.md](./02-discover.md) | Discover | Expand context / stakeholders |
| [03-define.md](./03-define.md) | Define | Reframe one clear challenge |
| [04-develop.md](./04-develop.md) | Develop | Fan out research angles |
| [05-gather.md](./05-gather.md) | Gather | Collect secondary sources |
| [06-extract.md](./06-extract.md) | Extract | Pull claims + gaps |
| [07-deliver.md](./07-deliver.md) | Deliver | Synthesize **one** brief (JSON) |
| [08-critique.md](./08-critique.md) | Critique | Independent QA pass |

Keep JSON response shapes stable unless you also update the TypeScript parsers
in `src/agent/intent.ts`, `src/agent/critique.ts`, and `src/agent/synthesisParse.ts`.
