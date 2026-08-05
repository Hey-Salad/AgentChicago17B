# Bug log

Living index of notable defects. Prefer GitHub issues with label `bug` for discussion; summarize closed/high-signal items here so contributors see patterns.

| ID | Area | Summary | Status | Notes |
| --- | --- | --- | --- | --- |
| — | — | _(none filed yet — open a [bug report](https://github.com/Hey-Salad/AgentChicago17B/issues/new?template=bug_report.yml))_ | — | — |

## How to add an entry

1. File an issue with the **Bug report** template.
2. After triage, add a one-line row here (issue number in **ID**).
3. When fixed, set Status to `fixed` and note the release (`@heysalad/chicago@x.y.z` or app commit).

## Hygiene rules

- Redact secrets before pasting logs.
- Include CLI version: `npm view @heysalad/chicago version`.
- For Worker bugs, include `/api/health` JSON (no auth headers).
