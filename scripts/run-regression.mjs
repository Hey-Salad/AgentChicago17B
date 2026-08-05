/**
 * Runs double-diamond regression tests via Vite SSR (no extra test runner dep).
 * Usage: npm test
 */
import { createServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
})

try {
  const harness = await server.ssrLoadModule('/src/agent/testHarness.ts')
  harness.resetTests()

  await server.ssrLoadModule('/src/agent/doubleDiamond.test.ts')
  await server.ssrLoadModule('/src/agent/synthesisParse.test.ts')
  await server.ssrLoadModule('/src/agent/pipeline.test.ts')
  await server.ssrLoadModule('/src/agent/intent.test.ts')
  await server.ssrLoadModule('/src/agent/chicagoCite.test.ts')

  console.log('\nAgentChicago17B double-diamond regression\n')
  const result = await harness.runRegisteredTests()
  console.log(`\n${result.passed} passed, ${result.failed} failed\n`)

  if (result.failed > 0) {
    process.exitCode = 1
  }
} finally {
  await server.close()
}
