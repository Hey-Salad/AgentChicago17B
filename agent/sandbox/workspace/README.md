# AgentChicago17B research workspace

This folder is seeded into the Eve sandbox at `/workspace`.

Suggested layout the agent creates per question:

```text
/workspace/
  READY.txt
  notes/<slug>/
    query.md
    angles.md
    extracts.md
  sources/<slug>/
    *.txt
  briefs/<slug>.md
```

Durable sessions keep `/workspace` across turns for the same Eve session.
