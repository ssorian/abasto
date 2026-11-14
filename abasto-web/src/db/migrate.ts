/**
 * Applies pending Drizzle migrations, then exits. Bundled into the production
 * image and run by the container entrypoint before the server starts, so a
 * failed migration keeps the new release from serving traffic.
 *
 * Uses the same `drizzle/` journal and migrations table as `drizzle-kit migrate`.
 * Usage: DATABASE_URL=... node migrate.mjs [migrationsFolder]
 */
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('migrate: DATABASE_URL is not set')
  process.exit(1)
}

const migrationsFolder = process.argv[2] ?? './drizzle'
const db = drizzle(databaseUrl)

try {
  await migrate(db, { migrationsFolder })
  console.log(`migrate: up to date (${migrationsFolder})`)
} catch (error) {
  console.error('migrate: failed', error)
  process.exitCode = 1
} finally {
  await db.$client.end()
}
