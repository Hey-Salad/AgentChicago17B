type TestFn = () => void | Promise<void>

interface TestCase {
  name: string
  fn: TestFn
}

interface Suite {
  name: string
  tests: TestCase[]
}

const suites: Suite[] = []
let current: Suite | null = null

export function describe(name: string, fn: () => void): void {
  const suite: Suite = { name, tests: [] }
  const previous = current
  current = suite
  suites.push(suite)
  fn()
  current = previous
}

export function it(name: string, fn: TestFn): void {
  if (!current) {
    throw new Error(`it("${name}") must be inside describe()`)
  }
  current.tests.push({ name, fn })
}

export function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (!Object.is(actual, expected)) {
        throw new Error(`Expected ${format(expected)}, got ${format(actual)}`)
      }
    },
    toEqual(expected: unknown) {
      const a = JSON.stringify(actual)
      const b = JSON.stringify(expected)
      if (a !== b) {
        throw new Error(`Expected ${b}, got ${a}`)
      }
    },
    toContain(expected: unknown) {
      if (typeof actual === 'string') {
        if (!actual.includes(String(expected))) {
          throw new Error(`Expected ${format(actual)} to contain ${format(expected)}`)
        }
        return
      }
      if (Array.isArray(actual)) {
        if (!actual.some((item) => Object.is(item, expected) || JSON.stringify(item) === JSON.stringify(expected))) {
          throw new Error(`Expected array to contain ${format(expected)}`)
        }
        return
      }
      throw new Error('toContain only supports string/array')
    },
    toMatch(regex: RegExp) {
      if (typeof actual !== 'string' || !regex.test(actual)) {
        throw new Error(`Expected ${format(actual)} to match ${regex}`)
      }
    },
    toHaveLength(length: number) {
      const value = actual as { length?: number }
      if (value?.length !== length) {
        throw new Error(`Expected length ${length}, got ${value?.length}`)
      }
    },
    toBeGreaterThan(n: number) {
      if (typeof actual !== 'number' || !(actual > n)) {
        throw new Error(`Expected ${format(actual)} > ${n}`)
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${format(actual)}`)
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${format(actual)}`)
      }
    },
    toThrow(matcher?: RegExp | string) {
      if (typeof actual !== 'function') {
        throw new Error('expect(...).toThrow requires a function')
      }
      let threw: unknown
      try {
        ;(actual as () => unknown)()
      } catch (error) {
        threw = error
      }
      if (!threw) throw new Error('Expected function to throw')
      if (matcher) {
        const message = threw instanceof Error ? threw.message : String(threw)
        const ok =
          typeof matcher === 'string'
            ? message.includes(matcher)
            : matcher.test(message)
        if (!ok) {
          throw new Error(`Expected throw message to match ${matcher}, got ${message}`)
        }
      }
    },
  }
}

export async function expectRejects(
  promise: Promise<unknown>,
  matcher?: RegExp | string,
): Promise<void> {
  let threw: unknown
  try {
    await promise
  } catch (error) {
    threw = error
  }
  if (!threw) throw new Error('Expected promise to reject')
  if (matcher) {
    const message = threw instanceof Error ? threw.message : String(threw)
    const ok =
      typeof matcher === 'string'
        ? message.includes(matcher)
        : matcher.test(message)
    if (!ok) {
      throw new Error(`Expected rejection to match ${matcher}, got ${message}`)
    }
  }
}

function format(value: unknown): string {
  try {
    return typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export async function runRegisteredTests(): Promise<{
  passed: number
  failed: number
  failures: string[]
}> {
  let passed = 0
  let failed = 0
  const failures: string[] = []

  for (const suite of suites) {
    for (const test of suite.tests) {
      const label = `${suite.name} > ${test.name}`
      try {
        await test.fn()
        passed += 1
        console.log(`  ✓ ${label}`)
      } catch (error) {
        failed += 1
        const message = error instanceof Error ? error.message : String(error)
        failures.push(`${label}\n    ${message}`)
        console.error(`  ✗ ${label}`)
        console.error(`    ${message}`)
      }
    }
  }

  return { passed, failed, failures }
}

export function resetTests(): void {
  suites.length = 0
  current = null
}
