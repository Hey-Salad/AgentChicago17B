# AgentChicago17B — Branding & UI prompt

Copy everything below the line into a **new Cursor chat** when you want to work only on branding and interface. Do not use this prompt for agent pipeline, models, or API work.

---

## Role

You are helping refine **branding and UI only** for **AgentChicago17B**, an open-source desk research agent.

Stay in design mode. Do **not** change research pipeline logic, LLM providers, proxies, env keys, or synthesis schema unless a UI change absolutely requires a tiny presentational tweak.

## Product in one line

AgentChicago17B runs desk research (scope → gather → synthesize) and returns **one synthesized brief**, not a stack of cards.

## Current UI (starting point)

- Stack: Vite + React + TypeScript
- Main files:
  - `src/App.tsx` — shell, sidebar, composer, empty state, results
  - `src/App.css` — tokens and layout
  - `src/index.css` — base
  - `src/components/SynthesisBrief.tsx` — research output
  - `src/components/SourceList.tsx` — source trail
- Visual direction today:
  - Dark, minimal, chat-like layout inspired by a clean assistant UI (black canvas, left sidebar, centered empty state, pill composer)
  - Font: Manrope
  - Brand name in sidebar: **AgentChicago17B**
  - Empty state headline: **Let’s research.**
  - Composer: ask field + model dropdown + send
  - Results: one synthesized brief (summary, narrative, findings, gaps, next steps)

## Brand intent

Give AgentChicago17B a distinct identity — not a generic ChatGPT clone and not HeySalad’s salad branding.

Suggested territory (you may refine, but commit to one):
- **Chicago research desk**: architectural, lake/steel, calm authority, editorial clarity
- Brand must read as the hero on the first viewport (name is not just a sidebar label)
- The empty state should feel like one composition, not a dashboard

## Design constraints

Follow the project frontend rules:

- One job per section
- Reduce clutter: no pill clusters, stat strips, or decorative badge spam
- Prefer expressive purposeful typography (avoid Inter / Roboto / Arial / system defaults)
- Avoid AI-default looks: purple gradients, warm cream + terracotta serif cliché, broadsheet hairline newspaper layouts
- Dark mode is allowed here because the product already committed to it — improve it, don’t casually flip to light unless asked
- Cards: only where interaction needs a container; the research output should stay a **single brief**, not a card wall
- Motion: 2–3 intentional motions max if you add any
- Desktop and mobile both matter; sidebar can collapse on small screens

Useful skills if available:
- `frontend-design`
- `brand-designer`
- `heysalad-brand` only as contrast reference (do **not** copy HeySalad’s salad identity onto this agent)

## What to deliver in this session

Work in this order unless I redirect you:

1. **Brand direction** — 1 short paragraph: personality, palette, type pairing, signature move
2. **Token pass** — update CSS variables in `src/App.css` / `src/index.css`
3. **Shell polish** — sidebar, empty state, composer, topbar
4. **Brief typography** — make `SynthesisBrief` feel editorial and scannable
5. **Optional** — favicon / simple wordmark SVG if it strengthens the brand

Show the app at `http://127.0.0.1:5173` after meaningful visual changes (`npm run dev` if needed).

## Out of scope

- Model benchmarking
- Cloudflare / NVIDIA / Tavily wiring
- Prompt schema for research JSON
- Backend/proxy refactors
- New product features unrelated to look, feel, and brand voice in the UI

## Starting request

Propose a clear brand direction for AgentChicago17B, then implement the first visual pass on the empty state + sidebar + composer so the product feels distinctive and less generic while staying simple.
