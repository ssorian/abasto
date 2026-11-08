import { beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { asc, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { warehouseAssignments } from '#/modules/access/db/schema'
import {
  assignWarehouse,
  bootstrapOwner,
  createStaffUser,
  requireActor,
} from '#/modules/access/services/access'
import { signIn } from '#/modules/access/lib/testing'
import { createWarehouse } from '#/modules/warehouses/services/warehouses'

beforeEach(() => resetDatabase(db))

describe('migration 0024: the clerk role becomes manager', () => {
  /** Every statement of the migration file, run as shipped. */
  const statements = () =>
    readFileSync(
      new URL(
        '../../../../drizzle/0024_remove_clerk_role.sql',
        import.meta.url,
      ),
      'utf8',
    ).split('--> statement-breakpoint')

  test('converts clerk rows without losing any and tightens the check', async () => {
    await bootstrapOwner({
      name: 'Dueño',
      email: 'dueno@abasto.test',
      password: 'secreto-123',
    })
    const owner = await requireActor(
      await signIn('dueno@abasto.test', 'secreto-123'),
    )
    const ana = await createStaffUser(owner, {
      name: 'Ana',
      email: 'ana@abasto.test',
      password: 'secreto-456',
    })
    const north = await createWarehouse(owner, { name: 'Norte' })
    const south = await createWarehouse(owner, { name: 'Sur' })
    await assignWarehouse(owner, {
      userId: ana.id,
      warehouseId: north.id,
      role: 'manager',
    })

    const rollback = new Error('rollback')
    const result = await db
      .transaction(async (tx) => {
        // Pre-migration shape: the check still allowed 'clerk'.
        await tx.execute(
          sql`ALTER TABLE warehouse_assignments DROP CONSTRAINT warehouse_assignments_role_check`,
        )
        await tx.execute(
          sql`INSERT INTO warehouse_assignments (user_id, warehouse_id, role) VALUES (${ana.id}, ${south.id}, 'clerk')`,
        )
        await tx.execute(
          sql`ALTER TABLE warehouse_assignments ADD CONSTRAINT warehouse_assignments_role_check CHECK (role in ('manager', 'clerk'))`,
        )
        for (const statement of statements())
          await tx.execute(sql.raw(statement))
        const rows = await tx
          .select({
            warehouseId: warehouseAssignments.warehouseId,
            role: warehouseAssignments.role,
          })
          .from(warehouseAssignments)
          .orderBy(asc(warehouseAssignments.warehouseId))
        let clerkStillAllowed = true
        await tx.execute(sql`SAVEPOINT probe`)
        try {
          await tx.execute(
            sql`UPDATE warehouse_assignments SET role = 'clerk' WHERE warehouse_id = ${south.id}`,
          )
        } catch {
          clerkStillAllowed = false
        }
        throw Object.assign(rollback, { rows, clerkStillAllowed })
      })
      .catch(
        (
          failure: Error & {
            rows?: Array<{ warehouseId: string; role: string }>
            clerkStillAllowed?: boolean
          },
        ) => {
          if (failure !== rollback) throw failure
          return failure
        },
      )

    expect(result.clerkStillAllowed).toBe(false)
    expect(
      [...(result.rows ?? [])].sort((a, b) =>
        a.warehouseId.localeCompare(b.warehouseId),
      ),
    ).toEqual(
      [
        { warehouseId: north.id, role: 'manager' },
        { warehouseId: south.id, role: 'manager' },
      ].sort((a, b) => a.warehouseId.localeCompare(b.warehouseId)),
    )
  })
})
