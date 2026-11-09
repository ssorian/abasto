import { beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { setupSupplierOrders } from '#/modules/inventory/services/supplier-testing'
import type { SupplierFixture } from '#/modules/inventory/services/supplier-testing'

beforeEach(() => resetDatabase(db))

/** The statements of migration 0027, as shipped. */
const statements = readFileSync(
  new URL(
    '../../../../drizzle/0027_supplier_reception_rework.sql',
    import.meta.url,
  ),
  'utf8',
)
  .split('--> statement-breakpoint')
  .map((part) => part.trim())
const backfill = statements.find((part) => part.includes('DO $$'))!
const originCheck = statements.find((part) =>
  part.includes('ADD CONSTRAINT "supplier_pendings_origin"'),
)!

type Legacy = {
  supplierId: string
  productId: string
  type: 'missing' | 'damaged' | 'replaced' | 'written_off'
  quantity: number
  valueCents: number
  at: string
}

type Row = {
  id: string
  supplier_id: string
  product_id: string
  type: string
  quantity: number
  value_cents: number
  settles_id: string | null
  created_at: Date | string
  actor_id: string
}

/**
 * Runs the migration's backfill over ledger rows written before 0027 (no
 * `settles_id`) and hands the result to `read`; everything is rolled back.
 */
async function migrated<T>(
  fx: SupplierFixture,
  legacy: Array<Legacy>,
  read: (
    run: (query: ReturnType<typeof sql>) => Promise<Array<Row>>,
    ids: Array<string>,
    verify: () => Promise<void>,
  ) => Promise<T>,
) {
  const rollback = new Error('rollback')
  return db
    .transaction(async (tx) => {
      // Rows from before 0027 cannot satisfy the new origin rule.
      await tx.execute(
        sql`ALTER TABLE supplier_pendings DROP CONSTRAINT supplier_pendings_origin`,
      )
      const ids: Array<string> = []
      for (const row of legacy) {
        const inserted = await tx.execute<{ id: string }>(sql`
          INSERT INTO supplier_pendings
            (supplier_id, product_id, type, quantity, value_cents, actor_id, created_at)
          VALUES (${row.supplierId}, ${row.productId}, ${row.type}, ${row.quantity},
            ${row.valueCents}, ${fx.owner.userId}, ${row.at}::timestamp)
          RETURNING id`)
        ids.push(inserted.rows[0].id)
      }
      await tx.execute(sql.raw(backfill))
      const run = async (query: ReturnType<typeof sql>) =>
        (await tx.execute<Row>(query)).rows
      const verify = async () => {
        // The new origin rule holds: every settlement names its origin.
        await tx.execute(sql.raw(originCheck))
      }
      throw Object.assign(rollback, {
        result: await read(run, ids, verify),
      })
    })
    .catch((failure: Error & { result?: T }) => {
      if (failure !== rollback) throw failure
      return failure.result as T
    })
}

const all = sql`SELECT * FROM supplier_pendings ORDER BY created_at, id`

describe('migration 0027: existing pendings get the origin they settle', () => {
  const ledger = (fx: SupplierFixture): Array<Legacy> => {
    const alpura = fx.supplier.id
    const milk = fx.milk.id
    const soda = fx.soda.id
    return [
      // Milk: P1 (missing 36), P2 (damaged 24), P3 (missing 12), then settlements.
      {
        supplierId: alpura,
        productId: milk,
        type: 'missing',
        quantity: 36,
        valueCents: 4032,
        at: '2026-10-01 10:00:00',
      },
      {
        supplierId: alpura,
        productId: milk,
        type: 'damaged',
        quantity: 24,
        valueCents: 2688,
        at: '2026-10-01 10:01:00',
      },
      {
        supplierId: alpura,
        productId: milk,
        type: 'missing',
        quantity: 12,
        valueCents: 1345,
        at: '2026-10-01 10:02:00',
      },
      // Spans P1 (36) and 12 units of P2.
      {
        supplierId: alpura,
        productId: milk,
        type: 'replaced',
        quantity: -48,
        valueCents: -5376,
        at: '2026-10-02 10:00:00',
      },
      {
        supplierId: alpura,
        productId: milk,
        type: 'written_off',
        quantity: -12,
        valueCents: -1344,
        at: '2026-10-03 10:00:00',
      },
      // Partly settles P3.
      {
        supplierId: alpura,
        productId: milk,
        type: 'replaced',
        quantity: -5,
        valueCents: -560,
        at: '2026-10-04 10:00:00',
      },
      // Soda: one damaged entry closed by two odd-valued settlements.
      {
        supplierId: alpura,
        productId: soda,
        type: 'damaged',
        quantity: 24,
        valueCents: 100,
        at: '2026-10-01 11:00:00',
      },
      {
        supplierId: alpura,
        productId: soda,
        type: 'written_off',
        quantity: -10,
        valueCents: -42,
        at: '2026-10-02 11:00:00',
      },
      {
        supplierId: alpura,
        productId: soda,
        type: 'written_off',
        quantity: -14,
        valueCents: -58,
        at: '2026-10-03 11:00:00',
      },
      // Another supplier, nothing settled.
      {
        supplierId: fx.cocaCola.id,
        productId: fx.cola.id,
        type: 'missing',
        quantity: 24,
        valueCents: 2400,
        at: '2026-10-01 12:00:00',
      },
    ]
  }

  const totals = (rows: Array<Row>) => {
    const map = new Map<
      string,
      {
        origin: number
        settled: number
        originValue: number
        settledValue: number
      }
    >()
    for (const row of rows) {
      const key = `${row.supplier_id}:${row.product_id}`
      const entry = map.get(key) ?? {
        origin: 0,
        settled: 0,
        originValue: 0,
        settledValue: 0,
      }
      if (row.quantity > 0) {
        entry.origin += row.quantity
        entry.originValue += row.value_cents
      } else {
        entry.settled += -row.quantity
        entry.settledValue += -row.value_cents
      }
      map.set(key, entry)
    }
    return map
  }

  test('keeps boxes and value per supplier and product, and every balance open or closed as before', async () => {
    const fx = await setupSupplierOrders()
    const result = await migrated(fx, ledger(fx), async (run, ids, verify) => {
      const after = await run(all)
      await verify()
      return { after, ids }
    })
    const legacyTotals = totals(
      ledger(fx).map((row) => ({
        id: '',
        supplier_id: row.supplierId,
        product_id: row.productId,
        type: row.type,
        quantity: row.quantity,
        value_cents: row.valueCents,
        settles_id: null,
        created_at: new Date(),
        actor_id: '',
      })),
    )
    expect(totals(result.after)).toEqual(legacyTotals)

    // Nothing unattributed: every settlement names an origin of the same supplier and product.
    const byId = new Map(result.after.map((row) => [row.id, row]))
    for (const row of result.after) {
      if (row.quantity > 0) {
        expect(row.settles_id).toBeNull()
        continue
      }
      const origin = byId.get(row.settles_id!)!
      expect(origin.quantity).toBeGreaterThan(0)
      expect([origin.supplier_id, origin.product_id]).toEqual([
        row.supplier_id,
        row.product_id,
      ])
    }

    // Per origin: what is still open, exactly as the old oldest-first model had it.
    const [p1, p2, p3, p4, p5] = [
      result.ids[0],
      result.ids[1],
      result.ids[2],
      result.ids[6],
      result.ids[9],
    ]
    const open = (id: string) => {
      const origin = byId.get(id)!
      const settled = result.after.filter((row) => row.settles_id === id)
      return [
        origin.quantity + settled.reduce((sum, row) => sum + row.quantity, 0),
        origin.value_cents +
          settled.reduce((sum, row) => sum + row.value_cents, 0),
      ]
    }
    expect(open(p1)).toEqual([0, 0])
    expect(open(p2)).toEqual([0, 0])
    expect(open(p3)).toEqual([7, 785])
    expect(open(p4)).toEqual([0, 0])
    expect(open(p5)).toEqual([24, 2400])
  })

  test('splits a settlement that spans origins, keeping the first row, its type, time and exact total', async () => {
    const fx = await setupSupplierOrders()
    const { after, ids } = await migrated(fx, ledger(fx), async (run, ids) => ({
      after: await run(all),
      ids,
    }))
    expect(after).toHaveLength(ledger(fx).length + 1)
    const spanning = after.filter(
      (row) =>
        row.type === 'replaced' &&
        String(row.created_at).includes('2026-10-02'),
    )
    expect(
      spanning.map((row) => [row.settles_id, row.quantity, row.value_cents]),
    ).toEqual(
      expect.arrayContaining([
        [ids[0], -36, -4032],
        [ids[1], -12, -1344],
      ]),
    )
    expect(spanning).toHaveLength(2)
    expect(spanning.some((row) => row.id === ids[3])).toBe(true)
    expect(spanning.every((row) => row.actor_id === fx.owner.userId)).toBe(true)
  })

  test('values partial settlements of one origin so they add up to its exact value', async () => {
    const fx = await setupSupplierOrders()
    const after = await migrated(fx, ledger(fx), (run) => run(all))
    const soda = after.filter((row) => row.product_id === fx.soda.id)
    expect(soda.reduce((sum, row) => sum + row.quantity, 0)).toBe(0)
    expect(soda.reduce((sum, row) => sum + row.value_cents, 0)).toBe(0)
  })

  test('the append-only trigger is enabled again afterwards', async () => {
    const fx = await setupSupplierOrders()
    const state = await migrated(fx, ledger(fx), async (run) =>
      run(
        sql`SELECT tgenabled::text AS type FROM pg_trigger WHERE tgname = 'supplier_pendings_no_update_delete'`,
      ),
    )
    expect(state.map((row) => row.type)).toEqual(['O'])
  })

  test('refuses, instead of guessing, a settlement that closes more than was owed', async () => {
    const fx = await setupSupplierOrders()
    const broken = [
      ...ledger(fx),
      {
        supplierId: fx.cocaCola.id,
        productId: fx.cola.id,
        type: 'written_off' as const,
        quantity: -30,
        valueCents: -3000,
        at: '2026-10-05 12:00:00',
      },
    ]
    let message = ''
    try {
      await migrated(fx, broken, async () => 'unreachable')
    } catch (error) {
      message = String((error as Error).cause ?? (error as Error).message)
    }
    expect(message).toContain('settles more than the supplier owed')
  })
})
