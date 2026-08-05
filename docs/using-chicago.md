# Using Chicago — end users

This guide is for **people using a Chicago research desk** that someone already deployed (for example HeySalad’s cloud instance, or your team’s Worker).

If you want to **deploy your own agent**, see [cloud-deploy.md](./cloud-deploy.md).

## What Chicago is

AgentChicago17B (“Chicago”) turns a research question into **one synthesized brief**:

1. Clarify the ask (if needed)  
2. Scope → plan → gather → extract → synthesize  
3. Deliver a brief + sources you can share  

It is a desk research agent, not a general chat bot.

## Open the desk

1. Go to your instance URL (example: `https://agentchicago17b.heysalad-o.workers.dev`).  
2. If you see **Sign in to the research desk**, enter the **shared access code** your admin gave you.  
3. Click **Unlock desk**.

The access code is checked by the cloud Worker. It is not published in the page source.

### Forgot / locked out?

Ask your instance admin to rotate the code:

```bash
npx wrangler secret put ACCESS_CODE
```

Then unlock again with the new code.

## Run a research pass

1. Type a clear research question in the composer (or pick a suggestion).  
2. Choose a model if your instance offers a picker.  
3. Send — watch the stage chip (scope → … → synthesize).  
4. Read the **brief**: summary, narrative, findings, gaps, next steps.  
5. Use **Share** for PDF / Markdown / email when available.

### Tips for better briefs

- Prefer a specific question over “tell me about X”.  
- Answer clarifying questions when the Intent step asks.  
- Without live search (Tavily), briefs use model knowledge — treat confidence as provisional.  

## Sessions

The sidebar **Your research** lists saved sessions on cloud instances (D1).  

- **New research** starts a fresh session.  
- Click a past session title to reopen / re-cook that thread.  

## Auth modes you might see

| Mode | What you do |
|------|-------------|
| Access code | Enter the shared team code |
| Cloudflare Access | Your company SSO / email OTP — no Chicago code |
| Anonymous | No login; sessions tied to this browser |
| OAuth | Sign in with GitHub/Google (when enabled) |

## Privacy & safety

- Only share the access code with people who should use the desk.  
- Do not paste secrets, customer PII, or regulated data into research prompts unless your org allows it.  
- Briefs may be stored on the instance (D1 / R2) so the team can resume work.

## Need help?

- Product map: [product-map.md](./product-map.md)  
- Auth details: [auth-modes.md](./auth-modes.md)  
- Install your own: [cloud-deploy.md](./cloud-deploy.md) · [chicago-cli.md](./chicago-cli.md)
