---
description: Use when collecting secondary sources for desk research via sandbox fetch tools.
---

# Gather

Collect secondary sources relevant to the challenge.

1. Call `persist_research_workspace` once.
2. For each candidate URL, call `run_source_notes` (sandbox-isolated fetch).
3. Prefer trusted publishers; never invent URLs.
4. Keep short excerpts under `/workspace/sources/<slug>/`.
