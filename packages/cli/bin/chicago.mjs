#!/usr/bin/env node
/**
 * chicago — AgentChicago17B instance CLI
 *
 * Onboarding is inspired by OpenClaw's guided wizard:
 * security notice → QuickStart/Advanced → numbered questions →
 * write config → doctor / next steps.
 */
import { readFile, writeFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_REPO = 'https://github.com/Hey-Salad/AgentChicago17B.git'

/** Prefer cwd project; fall back to monorepo checkout; else null (need scaffold). */
async function resolveRepoRoot() {
  const fromCwd = await findUp('wrangler.toml', process.cwd())
  if (fromCwd) return path.dirname(fromCwd)

  const inMonorepo = path.resolve(__dirname, '../../..')
  if (await fileExists(path.join(inMonorepo, 'wrangler.toml'))) return inMonorepo

  return null
}

async function findUp(filename, startDir) {
  let dir = path.resolve(startDir)
  for (;;) {
    const candidate = path.join(dir, filename)
    if (await fileExists(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

let repoRoot = await resolveRepoRoot()

const DEPLOY_TARGETS = [
  {
    id: 'local',
    label: 'Local desk',
    blurb: 'npm run dev — in-memory sessions API + Vite LLM proxy',
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare',
    blurb: 'Worker + D1/KV/R2/Vectorize — full production data plane',
    cli: 'wrangler',
  },
  {
    id: 'vercel',
    label: 'Vercel',
    blurb: 'Static SPA on Vercel (npx vercel) — UI + optional Eve',
    cli: 'vercel',
  },
  {
    id: 'firebase',
    label: 'Firebase Hosting',
    blurb: 'Static SPA on Firebase Hosting (firebase-tools)',
    cli: 'firebase',
  },
]

const AUTH_MODES = [
  {
    id: 'access-code',
    label: 'Access code',
    blurb: 'Shared team code — best default for a private desk',
  },
  {
    id: 'cf-access',
    label: 'Cloudflare Access',
    blurb: 'Zero Trust SSO in front of the app (enterprise)',
  },
  {
    id: 'oauth',
    label: 'OAuth (GitHub / Google)',
    blurb: 'Per-user accounts — multi-user product shape',
  },
  {
    id: 'anonymous',
    label: 'Anonymous device',
    blurb: 'No login — public demo with device-scoped sessions',
  },
]

const INFERENCE = [
  {
    id: 'cloudflare',
    label: 'Cloudflare Workers AI',
    blurb: 'Neurons / Workers AI — @cf/… models',
    envKeys: ['VITE_CF_API_KEY', 'VITE_CF_BASE_URL'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    blurb: 'Multi-provider router — Claude / GPT / Llama',
    envKeys: ['VITE_OPENROUTER_API_KEY'],
  },
  {
    id: 'nvidia',
    label: 'NVIDIA Build',
    blurb: 'integrate.api.nvidia.com free / Build keys',
    envKeys: ['VITE_LLM_API_KEY', 'VITE_LLM_BASE_URL'],
  },
]

const cmd = process.argv[2] || 'help'
const flags = parseFlags(process.argv.slice(3))

try {
  if (cmd === 'onboard' || cmd === 'init') await cmdOnboard()
  else if (cmd === 'configure') await cmdConfigure()
  else if (cmd === 'provision') await cmdProvision()
  else if (cmd === 'deploy') await cmdDeploy()
  else if (cmd === 'doctor') await cmdDoctor()
  else if (cmd === 'scaffold') await cmdScaffold(process.argv[3])
  else printHelp()
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
}

async function ensureRepoRoot(rl) {
  if (repoRoot) return repoRoot
  console.log(`
No AgentChicago17B project found in this directory.
The npm CLI scaffolds a fresh instance from GitHub, then runs onboard.
`)
  const dest =
    (flags.dir && String(flags.dir)) ||
    (rl
      ? (await rl.question('Clone into directory [./agentchicago17b]: ')).trim() ||
        'agentchicago17b'
      : 'agentchicago17b')
  await cmdScaffold(dest)
  repoRoot = path.resolve(process.cwd(), dest)
  return repoRoot
}

function parseFlags(args) {
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = args[i + 1]
      if (!next || next.startsWith('--')) out[key] = true
      else {
        out[key] = next
        i++
      }
    }
  }
  return out
}

function printHelp() {
  console.log(`
chicago — AgentChicago17B instance CLI (@heysalad/chicago)

  npx @heysalad/chicago onboard [--flow quickstart|advanced]
  npx @heysalad/chicago scaffold [dir]
  npx @heysalad/chicago configure [--access-code CODE]
  npx @heysalad/chicago provision          # Cloudflare bindings only
  npx @heysalad/chicago deploy [--target cloudflare|vercel|firebase] [--yes]
  npx @heysalad/chicago doctor [--url URL]

Agent / Codex / Claude (non-interactive):
  npx @heysalad/chicago scaffold my-agent
  cd my-agent && npm install
  npx @heysalad/chicago onboard --non-interactive --accept-risk \\
    --target cloudflare --access-code YOUR_CODE
  npx @heysalad/chicago deploy --target cloudflare --yes

Docs: https://github.com/Hey-Salad/AgentChicago17B/blob/main/docs/npm-publish.md
`)
}

async function cmdScaffold(destArg) {
  const dest = path.resolve(
    process.cwd(),
    destArg || flags.dir || 'agentchicago17b',
  )
  if (await fileExists(path.join(dest, 'wrangler.toml'))) {
    console.log(`Already a Chicago project: ${dest}`)
    repoRoot = dest
    return
  }
  if (await fileExists(dest)) {
    throw new Error(`Directory exists and is not a Chicago project: ${dest}`)
  }
  console.log(`Cloning ${TEMPLATE_REPO} → ${dest}`)
  await run('git', ['clone', '--depth', '1', TEMPLATE_REPO, dest], process.cwd())
  repoRoot = dest
  console.log(`
Scaffolded. Next:
  cd ${path.relative(process.cwd(), dest) || '.'}
  npm install
  npx @heysalad/chicago onboard
`)
}

async function cmdOnboard() {
  if (flags['non-interactive']) {
    if (!flags['accept-risk']) {
      throw new Error(
        'Non-interactive onboard requires --accept-risk (acknowledge agent/deploy risk).',
      )
    }
    await ensureRepoRoot(null)
    await applyAnswers(await answersFromFlags())
    console.log('\nNon-interactive onboard complete. Run: chicago doctor')
    return
  }

  const rl = readline.createInterface({ input, output })
  try {
    banner()
    await ensureRepoRoot(rl)
    const accepted = await confirmRisk(rl)
    if (!accepted) {
      console.log('Onboard cancelled.')
      return
    }

    const flow =
      flags.flow ||
      (await askMenu(rl, 'How do you want to set up?', [
        {
          id: 'quickstart',
          label: 'QuickStart',
          blurb: 'Sensible defaults — access-code + Cloudflare AI + local desk',
        },
        {
          id: 'advanced',
          label: 'Advanced',
          blurb: 'Choose every option (auth, inference, Eve, deploy target)',
        },
      ], 'quickstart'))

    const detected = await detectExistingKeys()
    if (detected.length) {
      console.log('\nDetected credentials / config on this machine:')
      for (const line of detected) console.log(`  · ${line}`)
    } else {
      console.log('\nNo inference keys detected yet — we will ask for what you need.')
    }

    let answers
    if (flow === 'quickstart') {
      answers = await quickstartAnswers(rl, detected)
    } else {
      answers = await advancedAnswers(rl, detected)
    }

    await applyAnswers(answers)
    printSummary(answers)

    const runDoc = await askYesNo(rl, 'Run chicago doctor now?', true)
    if (runDoc) {
      rl.close()
      await cmdDoctor()
      return
    }

    if (answers.deployTarget === 'cloudflare') {
      const prov = await askYesNo(
        rl,
        'Create Cloudflare D1/KV/R2/Vectorize bindings now (wrangler)?',
        false,
      )
      if (prov) {
        rl.close()
        await cmdProvision()
        return
      }
    }

    if (
      answers.deployTarget === 'cloudflare' ||
      answers.deployTarget === 'vercel' ||
      answers.deployTarget === 'firebase'
    ) {
      const go = await askYesNo(
        rl,
        `Deploy to ${answers.deployTarget} now? (needs ${answers.deployTarget} CLI logged in)`,
        false,
      )
      if (go) {
        rl.close()
        flags.target = answers.deployTarget
        flags.yes = true
        await cmdDeploy()
        return
      }
    }

    printNextSteps(answers)
  } finally {
    try {
      rl.close()
    } catch {
      /* already closed */
    }
  }
}

function banner() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  AgentChicago17B · chicago onboard                       ║
║  Install and configure your research-agent instance      ║
╚══════════════════════════════════════════════════════════╝
`)
}

async function confirmRisk(rl) {
  if (flags['accept-risk']) return true
  console.log(`Security notice
  This agent can call LLMs, persist sessions/briefs, and (when deployed)
  run on your Cloudflare account. You are responsible for API keys,
  access codes, and what the agent is allowed to read or write.

`)
  return askYesNo(rl, 'I understand and want to continue', true)
}

async function quickstartAnswers(rl, detected) {
  const name =
    (await rl.question('Workspace name [AgentChicago17B]: ')).trim() ||
    'AgentChicago17B'
  const inference = pickDetectedInference(detected) || 'cloudflare'
  console.log(`\nQuickStart will use:
  · auth:      access-code
  · inference: ${inference}
  · target:    local desk (npm run dev)
  · eve:       skip
`)
  const code = await askSecret(
    rl,
    'Shared access code (required for the desk gate)',
    Boolean(process.env.VITE_APP_ACCESS_CODE),
  )
  const keys = await askInferenceKeys(rl, inference, detected)
  return {
    flow: 'quickstart',
    name,
    auth: 'access-code',
    accessCode: code,
    inference,
    keys,
    eve: false,
    deployTarget: 'local',
    cloudflareAccountId: '',
    tavily: false,
    force: Boolean(flags.force),
  }
}

async function advancedAnswers(rl, detected) {
  const name =
    (await rl.question('Workspace name [AgentChicago17B]: ')).trim() ||
    'AgentChicago17B'

  const auth = await askMenu(rl, 'Who should unlock this desk?', AUTH_MODES, 'access-code')

  let accessCode = ''
  if (auth === 'access-code') {
    accessCode = await askSecret(rl, 'Shared access code', false)
  }

  const inference = await askMenu(
    rl,
    'Which inference provider should power briefs?',
    INFERENCE,
    pickDetectedInference(detected) || 'cloudflare',
  )
  const keys = await askInferenceKeys(rl, inference, detected)

  const tavily = await askYesNo(
    rl,
    'Enable Tavily live web search later (optional gather)?',
    false,
  )
  let tavilyKey = ''
  if (tavily) {
    tavilyKey = await askSecret(rl, 'Tavily API key (leave blank to set later)', true)
  }

  const eve = await askYesNo(
    rl,
    'Also set up Eve durable agent notes (optional Node/Vercel sidecar)?',
    false,
  )

  const deployTarget = await askMenu(
    rl,
    'Where will this instance run first?',
    DEPLOY_TARGETS,
    'local',
  )

  let cloudflareAccountId = ''
  if (deployTarget === 'cloudflare') {
    const fromEnv = process.env.CLOUDFLARE_ACCOUNT_ID || ''
    const fromToml = await readWranglerAccountId()
    const suggested = fromEnv || fromToml
    if (suggested) {
      console.log(`\nUsing Cloudflare account_id ${suggested} (from env or wrangler.toml)`)
      cloudflareAccountId = suggested
      const change = await askYesNo(rl, 'Use a different account_id?', false)
      if (change) {
        cloudflareAccountId = (
          await rl.question('Cloudflare account_id: ')
        ).trim()
      }
    } else {
      cloudflareAccountId = (
        await rl.question(
          'Cloudflare account_id (from dash.cloudflare.com → Workers → Account ID): ',
        )
      ).trim()
    }
  }

  return {
    flow: 'advanced',
    name,
    auth,
    accessCode,
    inference,
    keys,
    eve,
    deployTarget,
    cloudflareAccountId,
    tavily,
    tavilyKey,
    force: Boolean(flags.force),
  }
}

async function askInferenceKeys(rl, inference, detected) {
  const keys = {}
  if (inference === 'cloudflare') {
    if (!hasDetect(detected, 'VITE_CF_API_KEY')) {
      keys.VITE_CF_API_KEY = await askSecret(rl, 'Cloudflare API token (Workers AI)', true)
    }
    if (!hasDetect(detected, 'VITE_CF_BASE_URL')) {
      const base =
        (
          await rl.question(
            'Cloudflare AI base URL\n  [https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/v1]: ',
          )
        ).trim() || ''
      if (base) keys.VITE_CF_BASE_URL = base
    }
  } else if (inference === 'openrouter') {
    if (!hasDetect(detected, 'VITE_OPENROUTER_API_KEY')) {
      keys.VITE_OPENROUTER_API_KEY = await askSecret(rl, 'OpenRouter API key', true)
    }
  } else if (inference === 'nvidia') {
    if (!hasDetect(detected, 'VITE_LLM_API_KEY')) {
      keys.VITE_LLM_API_KEY = await askSecret(rl, 'NVIDIA Build API key', true)
    }
    keys.VITE_LLM_BASE_URL =
      keys.VITE_LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1'
  }
  return keys
}

async function answersFromFlags() {
  return {
    flow: flags.flow || 'quickstart',
    name: flags.name || 'AgentChicago17B',
    auth: flags.auth || 'access-code',
    accessCode: flags['access-code'] || '',
    inference: flags.inference || 'cloudflare',
    keys: {},
    eve: Boolean(flags['with-eve']),
    deployTarget: flags.target || 'local',
    cloudflareAccountId: flags['account-id'] || '',
    tavily: false,
    tavilyKey: '',
    force: Boolean(flags.force),
  }
}

async function applyAnswers(a) {
  const envPath = path.join(repoRoot, '.env')
  const example = await readFile(path.join(repoRoot, '.env.example'), 'utf8')
  let next = (await fileExists(envPath)) && !a.force
    ? await readFile(envPath, 'utf8')
    : example

  // If not forcing and .env exists, merge into existing; if force, start from example
  if ((await fileExists(envPath)) && a.force) {
    next = example
  }

  next = upsertEnv(next, 'VITE_AUTH_MODE', a.auth)
  next = upsertEnv(next, 'AUTH_MODE', a.auth)
  next = upsertEnv(
    next,
    'VITE_AUTH_REQUIRED',
    a.auth === 'cf-access' ? 'false' : 'true',
  )
  next = upsertEnv(next, 'WORKSPACE_NAME', a.name)
  next = upsertEnv(next, 'VITE_LLM_PROVIDER', a.inference)

  if (a.accessCode) {
    next = upsertEnv(next, 'VITE_APP_ACCESS_CODE', a.accessCode)
    next = upsertEnv(next, 'ACCESS_CODE', a.accessCode)
  }

  for (const [k, v] of Object.entries(a.keys || {})) {
    if (v) next = upsertEnv(next, k, v)
  }

  if (a.tavilyKey) {
    next = upsertEnv(next, 'VITE_TAVILY_API_KEY', a.tavilyKey)
  }

  if (a.eve) {
    next = upsertEnv(next, 'EVE_LLM_BACKEND', a.inference === 'cloudflare' ? 'cloudflare' : 'vercel-gateway')
    next = upsertEnv(next, 'VITE_EVE_BASE_URL', '/eve')
  }

  const exists = await fileExists(envPath)
  if (exists && !a.force && flags['write-chicago']) {
    await writeFile(path.join(repoRoot, '.env.chicago'), next)
    console.log('\nWrote .env.chicago (existing .env preserved)')
  } else if (exists && !a.force) {
    await writeFile(envPath, next)
    console.log('\nUpdated .env (merged answers)')
  } else {
    await writeFile(envPath, next)
    console.log('\nWrote .env')
  }

  // Persist wizard answers for doctor / provision
  const statePath = path.join(repoRoot, '.chicago-onboard.json')
  await writeFile(
    statePath,
    JSON.stringify(
      {
        completedAt: new Date().toISOString(),
        flow: a.flow,
        auth: a.auth,
        inference: a.inference,
        deployTarget: a.deployTarget,
        cloudflareAccountId: a.cloudflareAccountId || null,
        eve: a.eve,
        name: a.name,
      },
      null,
      2,
    ),
  )

  if (a.cloudflareAccountId) {
    await patchWranglerAccount(a.cloudflareAccountId)
  }
}

function printSummary(a) {
  console.log(`
── Onboard complete ─────────────────────────────────────
  workspace:  ${a.name}
  flow:       ${a.flow}
  auth:       ${a.auth}
  inference:  ${a.inference}
  deploy:     ${a.deployTarget}
  eve:        ${a.eve ? 'notes enabled' : 'skip'}
─────────────────────────────────────────────────────────`)
}

function printNextSteps(a) {
  console.log(`
Next steps:`)
  if (a.deployTarget === 'local') {
    console.log(`  1. npm install
  2. npm run dev
  3. Open http://127.0.0.1:5173
  4. chicago doctor`)
  } else if (a.deployTarget === 'cloudflare') {
    console.log(`  1. chicago provision          # create CF bindings + patch wrangler.toml
  2. npx wrangler secret put ACCESS_CODE
  3. npx wrangler secret put CF_API_TOKEN
  4. chicago deploy --target cloudflare --yes
  5. chicago doctor --url https://YOUR_WORKER.workers.dev`)
  } else if (a.deployTarget === 'vercel') {
    console.log(`  1. npx vercel login            # once per machine
  2. chicago deploy --target vercel --yes
  3. Set server env in Vercel dashboard (CF_API_TOKEN / access code)
  4. chicago doctor --url https://YOUR_PROJECT.vercel.app
  Note: static SPA only unless you add /api LLM routes (see README).`)
  } else if (a.deployTarget === 'firebase') {
    console.log(`  1. npx firebase login
  2. npx firebase use --add               # pick project
  3. chicago deploy --target firebase --yes
  4. chicago doctor --url https://YOUR_PROJECT.web.app
  Note: Hosting serves dist/; live LLM needs Functions/Cloud Run (see README).`)
  }
  if (a.eve) {
    console.log(`  · Eve: npm run eve  (separate terminal) — docs/eve-integration.md`)
  }
  console.log('')
}

async function cmdConfigure() {
  await ensureRepoRoot(null)
  const envPath = path.join(repoRoot, '.env')
  let text = (await fileExists(envPath))
    ? await readFile(envPath, 'utf8')
    : await readFile(path.join(repoRoot, '.env.example'), 'utf8')

  if (!flags['access-code'] && !flags.set && !flags['non-interactive']) {
    const rl = readline.createInterface({ input, output })
    try {
      console.log('chicago configure — interactive secrets\n')
      const mode = readEnv(text, 'VITE_AUTH_MODE') || 'access-code'
      if (mode === 'access-code') {
        const code = await askSecret(rl, 'Access code', true)
        if (code) {
          text = upsertEnv(text, 'VITE_APP_ACCESS_CODE', code)
          text = upsertEnv(text, 'ACCESS_CODE', code)
        }
      }
      const provider = readEnv(text, 'VITE_LLM_PROVIDER') || 'cloudflare'
      const more = await askInferenceKeys(rl, provider, await detectExistingKeys())
      for (const [k, v] of Object.entries(more)) {
        if (v) text = upsertEnv(text, k, v)
      }
    } finally {
      rl.close()
    }
  }

  if (flags['access-code']) {
    text = upsertEnv(text, 'VITE_APP_ACCESS_CODE', String(flags['access-code']))
    text = upsertEnv(text, 'ACCESS_CODE', String(flags['access-code']))
  }
  if (typeof flags.set === 'string') {
    const [k, ...rest] = flags.set.split('=')
    text = upsertEnv(text, k, rest.join('='))
  }

  await writeFile(envPath, text)
  console.log('Updated .env')
  if (flags['access-code'] || readEnv(text, 'ACCESS_CODE')) {
    console.log('Tip: wrangler secret put ACCESS_CODE')
  }
}

async function patchWranglerAccount(accountId) {
  const wranglerPath = path.join(repoRoot, 'wrangler.toml')
  let text = await readFile(wranglerPath, 'utf8')
  if (/^account_id\s*=/m.test(text)) {
    text = text.replace(/^account_id\s*=.*$/m, `account_id = "${accountId}"`)
  } else {
    text = text.replace(
      /^compatibility_flags.*$/m,
      (line) => `${line}\naccount_id = "${accountId}"`,
    )
  }
  await writeFile(wranglerPath, text)
  console.log(`Patched wrangler.toml account_id = ${accountId}`)
}

async function readWranglerAccountId() {
  const wranglerPath = path.join(repoRoot, 'wrangler.toml')
  if (!(await fileExists(wranglerPath))) return ''
  const text = await readFile(wranglerPath, 'utf8')
  const m = text.match(/^account_id\s*=\s*"([^"]+)"/m)
  return m?.[1] || ''
}

function patchWranglerBinding(text, kind, values) {
  // kind: d1 | kv | r2 | vectorize
  if (kind === 'd1' && values.database_id) {
    text = text.replace(
      /database_id\s*=\s*"[^"]*"/,
      `database_id = "${values.database_id}"`,
    )
    if (values.database_name) {
      text = text.replace(
        /database_name\s*=\s*"[^"]*"/,
        `database_name = "${values.database_name}"`,
      )
    }
  }
  if (kind === 'kv' && values.id) {
    text = text.replace(
      /\[\[kv_namespaces\]\][\s\S]*?id\s*=\s*"[^"]*"/,
      (block) => block.replace(/id\s*=\s*"[^"]*"/, `id = "${values.id}"`),
    )
  }
  if (kind === 'r2' && values.bucket_name) {
    text = text.replace(
      /bucket_name\s*=\s*"[^"]*"/,
      `bucket_name = "${values.bucket_name}"`,
    )
  }
  if (kind === 'vectorize' && values.index_name) {
    text = text.replace(
      /index_name\s*=\s*"[^"]*"/,
      `index_name = "${values.index_name}"`,
    )
  }
  return text
}

async function cmdProvision() {
  await ensureRepoRoot(null)
  console.log('Provisioning Cloudflare resources via Wrangler…\n')
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    (flags['account-id'] && flags['account-id'] !== true
      ? String(flags['account-id'])
      : '') ||
    (await readWranglerAccountId()) ||
    ''
  if (!accountId) {
    throw new Error(
      'Set CLOUDFLARE_ACCOUNT_ID, pass --account-id, or put account_id in wrangler.toml before provision.',
    )
  }
  const env = {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: accountId,
  }
  if (env.CF_API_TOKEN && !env.CLOUDFLARE_API_TOKEN) {
    env.CLOUDFLARE_API_TOKEN = env.CF_API_TOKEN
  }

  const d1Name = 'agentchicago17b'
  const kvTitle = 'agentchicago17b-cache'
  const r2Name = 'agentchicago17b-blobs'
  const vecName = 'agentchicago17b-rag'

  console.log(`→ D1 database ${d1Name}`)
  const d1Out = await capture('npx', ['wrangler', 'd1', 'create', d1Name], repoRoot, env)
  console.log(d1Out.text.slice(-800))

  console.log(`→ KV namespace ${kvTitle}`)
  const kvOut = await capture(
    'npx',
    ['wrangler', 'kv', 'namespace', 'create', kvTitle],
    repoRoot,
    env,
  )
  console.log(kvOut.text.slice(-800))

  console.log(`→ R2 bucket ${r2Name}`)
  const r2Out = await capture(
    'npx',
    ['wrangler', 'r2', 'bucket', 'create', r2Name],
    repoRoot,
    env,
  )
  console.log(r2Out.text.slice(-500))

  console.log(`→ Vectorize index ${vecName}`)
  const vecOut = await capture(
    'npx',
    [
      'wrangler',
      'vectorize',
      'create',
      vecName,
      '--dimensions=768',
      '--metric=cosine',
    ],
    repoRoot,
    env,
  )
  console.log(vecOut.text.slice(-800))

  let wrangler = await readFile(path.join(repoRoot, 'wrangler.toml'), 'utf8')
  const d1Id = extractFirst(
    d1Out.text,
    /database_id\s*=\s*"([^"]+)"/i,
    /"uuid"\s*:\s*"([^"]+)"/i,
  )
  const kvId = extractFirst(
    kvOut.text,
    /id\s*=\s*"([a-f0-9-]{36})"/i,
    /"id"\s*:\s*"([a-f0-9-]{36})"/i,
  )

  if (d1Id) {
    wrangler = patchWranglerBinding(wrangler, 'd1', {
      database_id: d1Id,
      database_name: d1Name,
    })
    console.log(`Patched D1 database_id = ${d1Id}`)
  }
  if (kvId) {
    wrangler = patchWranglerBinding(wrangler, 'kv', { id: kvId })
    console.log(`Patched KV id = ${kvId}`)
  }
  wrangler = patchWranglerBinding(wrangler, 'r2', { bucket_name: r2Name })
  wrangler = patchWranglerBinding(wrangler, 'vectorize', { index_name: vecName })
  await writeFile(path.join(repoRoot, 'wrangler.toml'), wrangler)

  if (d1Id) {
    console.log(`\n→ Applying D1 migrations remotely…`)
    await runOptional(
      'npx',
      ['wrangler', 'd1', 'migrations', 'apply', d1Name, '--remote'],
      repoRoot,
      env,
    )
  }

  console.log(`
Provision finished.

Next:
  npx wrangler secret put ACCESS_CODE
  npx wrangler secret put CF_API_TOKEN
  chicago deploy
`)
}

function extractFirst(text, ...regexes) {
  for (const re of regexes) {
    const m = text.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

function capture(command, args, cwd, env = process.env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let text = ''
    child.stdout.on('data', (d) => {
      text += d.toString()
    })
    child.stderr.on('data', (d) => {
      text += d.toString()
    })
    child.on('error', (err) => resolve({ code: 1, text: String(err) }))
    child.on('exit', (code) => resolve({ code: code ?? 1, text }))
  })
}

async function cmdDeploy() {
  await ensureRepoRoot(null)
  const target = await resolveDeployTarget()
  if (target === 'local') {
    console.log('Deploy target is local — nothing to push. Run: npm run dev')
    return
  }

  console.log(`Building SPA for ${target}…`)
  await run('npm', ['run', 'build'], repoRoot)

  if (target === 'cloudflare') {
    await deployCloudflare()
  } else if (target === 'vercel') {
    await deployVercel()
  } else if (target === 'firebase') {
    await deployFirebase()
  } else {
    throw new Error(`Unknown deploy target: ${target}`)
  }
}

async function resolveDeployTarget() {
  const fromFlag = flags.target || flags.platform
  if (fromFlag && fromFlag !== true) {
    const id = String(fromFlag).toLowerCase()
    if (!DEPLOY_TARGETS.some((t) => t.id === id)) {
      throw new Error(
        `Invalid --target ${id}. Use: local | cloudflare | vercel | firebase`,
      )
    }
    return id
  }

  const statePath = path.join(repoRoot, '.chicago-onboard.json')
  if (await fileExists(statePath)) {
    try {
      const state = JSON.parse(await readFile(statePath, 'utf8'))
      if (state.deployTarget && state.deployTarget !== 'local') {
        return state.deployTarget
      }
    } catch {
      /* ignore */
    }
  }

  if (flags.yes || flags['non-interactive']) {
    return 'cloudflare'
  }

  const rl = readline.createInterface({ input, output })
  try {
    return await askMenu(
      rl,
      'Deploy where?',
      DEPLOY_TARGETS.filter((t) => t.id !== 'local'),
      'cloudflare',
    )
  } finally {
    rl.close()
  }
}

async function deployCloudflare() {
  console.log('Deploying Worker + assets via Wrangler…')
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    (flags['account-id'] && flags['account-id'] !== true
      ? String(flags['account-id'])
      : '') ||
    (await readWranglerAccountId()) ||
    ''
  const env = { ...process.env }
  if (accountId) env.CLOUDFLARE_ACCOUNT_ID = accountId
  if (env.CF_API_TOKEN && !env.CLOUDFLARE_API_TOKEN) {
    env.CLOUDFLARE_API_TOKEN = env.CF_API_TOKEN
  }
  const args = ['wrangler', 'deploy']
  if (flags.env === 'production') args.push('--env', 'production')
  const code = await runOptional('npx', args, repoRoot, env)
  if (code !== 0) {
    console.error(
      'Wrangler deploy failed. Run chicago provision, fix wrangler.toml ids, set secrets, retry.',
    )
    process.exitCode = code || 1
    return
  }
  console.log('Cloudflare deploy complete. Run: chicago doctor --url https://YOUR_HOST')
}

async function deployVercel() {
  const hasCli = (await whichOk('vercel')) || true // always can npx
  console.log('Deploying static dist/ via Vercel CLI…')
  if (!(await fileExists(path.join(repoRoot, 'dist', 'index.html')))) {
    throw new Error('dist/index.html missing after build')
  }

  // Prefer deploying the built SPA folder (avoids Eve-only vercel.json buildCommand).
  const args = ['--yes', 'vercel', 'deploy', 'dist', '--prod', '--yes']
  if (flags['vercel-token'] && flags['vercel-token'] !== true) {
    args.push('--token', String(flags['vercel-token']))
  }
  const code = await runOptional('npx', args, repoRoot)
  if (code !== 0) {
    console.error(
      'Vercel deploy failed. Run: npx vercel login  (or pass --vercel-token)',
    )
    process.exitCode = code || 1
    return
  }
  void hasCli
  console.log(
    'Vercel deploy complete. Set CF_API_TOKEN / access secrets in the Vercel project if you add API routes.',
  )
}

async function deployFirebase() {
  await ensureFirebaseConfig()
  console.log('Deploying Hosting via Firebase CLI…')
  const args = ['--yes', 'firebase-tools', 'deploy', '--only', 'hosting']
  if (flags.yes || flags['non-interactive']) {
    args.push('--non-interactive')
  }
  if (flags.project && flags.project !== true) {
    args.push('--project', String(flags.project))
  }
  const code = await runOptional('npx', args, repoRoot)
  if (code !== 0) {
    console.error(
      'Firebase deploy failed. Run: npx firebase login && npx firebase use --add',
    )
    process.exitCode = code || 1
    return
  }
  console.log('Firebase Hosting deploy complete.')
}

async function ensureFirebaseConfig() {
  const jsonPath = path.join(repoRoot, 'firebase.json')
  if (!(await fileExists(jsonPath))) {
    const config = {
      hosting: {
        public: 'dist',
        ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
        rewrites: [{ source: '**', destination: '/index.html' }],
      },
    }
    await writeFile(jsonPath, `${JSON.stringify(config, null, 2)}\n`)
    console.log('Wrote firebase.json (Hosting → dist/, SPA rewrites)')
  }
  const rcPath = path.join(repoRoot, '.firebaserc')
  if (!(await fileExists(rcPath)) && !(flags.project && flags.project !== true)) {
    console.log(
      'Tip: no .firebaserc yet — pass --project YOUR_FIREBASE_PROJECT or run firebase use --add',
    )
  }
}

function whichOk(bin) {
  return new Promise((resolve) => {
    const child = spawn(bin, ['--version'], {
      stdio: 'ignore',
      shell: false,
    })
    child.on('error', () => resolve(false))
    child.on('exit', (code) => resolve(code === 0))
  })
}

async function cmdDoctor() {
  if (!repoRoot) {
    console.log('No project in cwd — run from a Chicago checkout or: chicago scaffold')
    process.exitCode = 1
    return
  }
  const checks = []
  checks.push(await checkFile('wrangler.toml'))
  checks.push(await checkFile('workers/api/src/index.ts'))
  checks.push(await checkFile('workers/api/migrations/0001_init.sql'))
  checks.push(await checkFile('docs/product-map.md'))
  checks.push(await checkFile('docs/auth-modes.md'))
  checks.push(await checkFile('packages/cli/bin/chicago.mjs'))

  for (const t of ['wrangler', 'vercel', 'firebase']) {
    const ok = await whichOk(t)
    checks.push({
      name: `cli ${t}`,
      ok: true,
      detail: ok ? 'on PATH' : 'not on PATH (npx still works for deploy)',
    })
  }

  const envPath = path.join(repoRoot, '.env')
  const hasEnv = await fileExists(envPath)
  checks.push({
    name: '.env',
    ok: hasEnv,
    detail: hasEnv ? 'present' : 'missing — run chicago onboard',
  })

  if (hasEnv) {
    const env = await readFile(envPath, 'utf8')
    const mode = readEnv(env, 'VITE_AUTH_MODE') || 'access-code'
    checks.push({
      name: 'auth mode',
      ok: AUTH_MODES.some((m) => m.id === mode),
      detail: mode,
    })
    if (mode === 'access-code') {
      const code = readEnv(env, 'VITE_APP_ACCESS_CODE')
      checks.push({
        name: 'access code',
        ok: Boolean(code),
        detail: code ? 'set' : 'empty — chicago configure',
      })
    }
    const provider = readEnv(env, 'VITE_LLM_PROVIDER') || 'cloudflare'
    checks.push({ name: 'inference provider', ok: true, detail: provider })
    if (provider === 'cloudflare') {
      checks.push({
        name: 'CF key',
        ok: Boolean(readEnv(env, 'VITE_CF_API_KEY')),
        detail: readEnv(env, 'VITE_CF_API_KEY') ? 'set' : 'missing',
      })
    }
    if (provider === 'openrouter') {
      checks.push({
        name: 'OpenRouter key',
        ok: Boolean(readEnv(env, 'VITE_OPENROUTER_API_KEY')),
        detail: readEnv(env, 'VITE_OPENROUTER_API_KEY') ? 'set' : 'missing',
      })
    }
  }

  const onboardPath = path.join(repoRoot, '.chicago-onboard.json')
  if (await fileExists(onboardPath)) {
    const state = JSON.parse(await readFile(onboardPath, 'utf8'))
    checks.push({
      name: 'onboard state',
      ok: true,
      detail: `${state.flow} · ${state.auth} · ${state.deployTarget}`,
    })
  }

  const base = flags.url || 'http://127.0.0.1:5173'
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/health`)
    const body = await res.json()
    checks.push({
      name: `health ${base}`,
      ok: res.ok && body.ok,
      detail: JSON.stringify(body),
    })
  } catch (err) {
    checks.push({
      name: `health ${base}`,
      ok: false,
      detail: err instanceof Error ? err.message : 'unreachable',
    })
  }

  let failed = 0
  for (const c of checks) {
    const mark = c.ok ? '✓' : '✗'
    console.log(`${mark} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)
    if (!c.ok) failed++
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed')
  process.exitCode = failed ? 1 : 0
}

/** Numbered menu like OpenClaw classic wizard */
async function askMenu(rl, title, options, fallbackId) {
  console.log(`\n${title}`)
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}) ${opt.label}`)
    if (opt.blurb) console.log(`      ${opt.blurb}`)
  })
  const fallbackIndex = Math.max(
    0,
    options.findIndex((o) => o.id === fallbackId),
  )
  const raw = (
    await rl.question(`Choose [1-${options.length}] (default ${fallbackIndex + 1}): `)
  ).trim()
  if (!raw) return options[fallbackIndex].id
  const asNum = Number(raw)
  if (Number.isInteger(asNum) && asNum >= 1 && asNum <= options.length) {
    return options[asNum - 1].id
  }
  const byId = options.find((o) => o.id === raw || o.label.toLowerCase() === raw.toLowerCase())
  if (byId) return byId.id
  console.log(`  Using default: ${options[fallbackIndex].label}`)
  return options[fallbackIndex].id
}

async function askYesNo(rl, question, defaultYes) {
  const hint = defaultYes ? 'Y/n' : 'y/N'
  const raw = (await rl.question(`${question} [${hint}]: `)).trim().toLowerCase()
  if (!raw) return defaultYes
  return raw === 'y' || raw === 'yes'
}

async function askSecret(rl, label, optional) {
  const suffix = optional ? ' (optional, Enter to skip)' : ''
  const value = (await rl.question(`${label}${suffix}: `)).trim()
  if (!value && !optional) {
    console.log('  (left blank — set later with chicago configure)')
  }
  return value
}

async function detectExistingKeys() {
  const found = []
  const envPath = path.join(repoRoot, '.env')
  let fileEnv = ''
  if (await fileExists(envPath)) {
    fileEnv = await readFile(envPath, 'utf8')
  }
  const watch = [
    'VITE_CF_API_KEY',
    'VITE_CF_BASE_URL',
    'VITE_OPENROUTER_API_KEY',
    'VITE_LLM_API_KEY',
    'VITE_TAVILY_API_KEY',
    'VITE_APP_ACCESS_CODE',
    'CF_API_TOKEN',
    'OPENROUTER_API_KEY',
  ]
  for (const key of watch) {
    if (process.env[key]) found.push(`${key} (process env)`)
    else if (fileEnv && readEnv(fileEnv, key)) found.push(`${key} (.env)`)
  }
  return found
}

function hasDetect(detected, key) {
  return detected.some((line) => line.startsWith(key))
}

function pickDetectedInference(detected) {
  if (hasDetect(detected, 'VITE_OPENROUTER_API_KEY') || hasDetect(detected, 'OPENROUTER_API_KEY')) {
    return 'openrouter'
  }
  if (hasDetect(detected, 'VITE_CF_API_KEY') || hasDetect(detected, 'CF_API_TOKEN')) {
    return 'cloudflare'
  }
  if (hasDetect(detected, 'VITE_LLM_API_KEY')) return 'nvidia'
  return null
}

function upsertEnv(text, key, value) {
  const line = `${key}=${value}`
  const re = new RegExp(`^${key}=.*$`, 'm')
  if (re.test(text)) return text.replace(re, line)
  return `${text.trimEnd()}\n${line}\n`
}

function readEnv(text, key) {
  const m = text.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return m ? m[1].trim() : ''
}

async function fileExists(p) {
  try {
    await access(p, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function checkFile(rel) {
  const ok = await fileExists(path.join(repoRoot, rel))
  return { name: rel, ok, detail: ok ? 'ok' : 'missing' }
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`))
    })
  })
}

function runOptional(command, args, cwd, env = process.env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit', shell: false })
    child.on('error', () => resolve(1))
    child.on('exit', (code) => resolve(code ?? 1))
  })
}
