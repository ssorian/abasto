/**
 * `bun test` preload: points the shared client at the isolated test database
 * and applies the migrations before any test file imports `#/db`.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { assertTestDatabaseUrl, defaultTestDatabaseUrl } from '#/db/testing'

process.env.DATABASE_URL = assertTestDatabaseUrl(
  process.env.TEST_DATABASE_URL ?? defaultTestDatabaseUrl,
)
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000'
process.env.BETTER_AUTH_SECRET ??= 'test-only-secret-not-used-outside-bun-test'

const migrationsFolder = join(import.meta.dir, '../../drizzle')
if (existsSync(join(migrationsFolder, 'meta/_journal.json'))) {
  const { db } = await import('#/db')
  const { migrate } = await import('drizzle-orm/node-postgres/migrator')
  await migrate(db, { migrationsFolder })
}
