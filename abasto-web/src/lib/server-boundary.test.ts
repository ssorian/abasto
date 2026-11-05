import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Client code imports server-function files to call them. TanStack Start
 * replaces each `createServerFn` handler with an RPC stub, so its imports drop
 * out of the browser bundle, but any other exported value stays and drags its
 * imports (services, `#/db`, `pg`) into the browser, which then crashes with
 * "Buffer is not defined". Helpers belong in a separate server-only module.
 */
const modulesDir = join(import.meta.dir, '../modules')

function serverFunctionFiles() {
  return readdirSync(modulesDir).flatMap((module) => {
    const dir = join(modulesDir, module, 'server')
    let files: Array<string>
    try {
      files = readdirSync(dir)
    } catch {
      return []
    }
    return files
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
      .map((file) => join(dir, file))
      .filter((path) => readFileSync(path, 'utf8').includes('createServerFn('))
  })
}

describe('server-function files', () => {
  test('there are some to check', () => {
    expect(serverFunctionFiles().length).toBeGreaterThan(5)
  })

  test('export only server functions and types', () => {
    const offenders = serverFunctionFiles().flatMap((path) => {
      const source = readFileSync(path, 'utf8')
      const values = [
        ...source.matchAll(
          /^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)(.*)$/gm,
        ),
      ]
        .filter(([, , rest]) => !/^\s*=\s*createServerFn\(/.test(rest))
        .map(([, name]) => name)
      const reexports = [...source.matchAll(/^export\s+(\{|\*)/gm)].map(
        () => 'export { … }',
      )
      return [...values, ...reexports].map(
        (name) => `${path.slice(modulesDir.length + 1)}: ${name}`,
      )
    })
    expect(offenders).toEqual([])
  })
})
