import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

export const defaultTestDatabaseUrl =
  'postgresql://abasto:abasto@localhost:55451/abasto_test'

/** Guards destructive test helpers: only databases named `*_test` are accepted. */
export function assertTestDatabaseUrl(url: string) {
  const name = decodeURIComponent(new URL(url).pathname.slice(1))
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against "${name}": the test database name must end in _test.`,
    )
  }
  return url
}

/** Empties every application table (migrations live in the `drizzle` schema). */
export async function resetDatabase(database: NodePgDatabase<any>) {
  const result = await database.execute<{ name: string }>(
    sql`select tablename as name from pg_tables where schemaname = 'public'`,
  )
  if (!result.rows.length) return
  const tables = result.rows.map(({ name }) => `"public"."${name}"`).join(', ')
  // Append-only tables refuse TRUNCATE unless this transaction opts in.
  await database.transaction(async (tx) => {
    await tx.execute(sql`set local abasto.allow_truncate = on`)
    await tx.execute(
      sql.raw(`truncate table ${tables} restart identity cascade`),
    )
  })
}
