import { describe, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { db } from '#/db'
import { assertTestDatabaseUrl } from '#/db/testing'

describe('assertTestDatabaseUrl', () => {
  test('accepts a database whose name ends in _test', () => {
    const url = 'postgresql://abasto:abasto@localhost:55450/abasto_test'
    expect(assertTestDatabaseUrl(url)).toBe(url)
  })

  test('refuses any other database so tests never touch real data', () => {
    expect(() =>
      assertTestDatabaseUrl(
        'postgresql://abasto:abasto@localhost:55450/abasto',
      ),
    ).toThrow(
      'Refusing to run tests against "abasto": the test database name must end in _test.',
    )
  })
})

test('the shared client is connected to the test database', async () => {
  const result = await db.execute<{ name: string }>(
    sql`select current_database() as name`,
  )
  expect(result.rows[0]?.name).toBe('abasto_test')
})
