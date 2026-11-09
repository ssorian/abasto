import { beforeEach, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { cashMovements } from '#/modules/cash/db/schema'
import { lots, stockMovements } from '#/modules/inventory/db/schema'
import {
  assignRider,
  cancelAssignment,
  settleAssignment,
} from '#/modules/riders/services/assignments'
import { receive, setupRiders } from '#/modules/riders/services/testing'

beforeEach(() => resetDatabase(db))

const outcomes = (results: Array<PromiseSettledResult<unknown>>) =>
  results.map((r) => r.status)

test('two concurrent assignments cannot oversell a lot', async () => {
  for (let round = 0; round < 3; round++) {
    await resetDatabase(db)
    const fx = await setupRiders()
    const lot = await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
    const results = await Promise.allSettled(
      [fx.rider.id, fx.other.id].map((riderId) =>
        assignRider(fx.staffA, {
          riderId,
          lines: [{ productId: fx.milkBox.id, boxes: 0, units: 80 }],
        }),
      ),
    )
    expect(outcomes(results).sort()).toEqual(['fulfilled', 'rejected'])
    const [row] = await db.select().from(lots).where(eq(lots.id, lot.id))
    expect(row).toMatchObject({ onHand: 100, reserved: 80 })
  }
})

test('racing settles of one assignment sell and charge it once', async () => {
  for (let round = 0; round < 3; round++) {
    await resetDatabase(db)
    const fx = await setupRiders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
    const detail = await assignRider(fx.staffA, {
      riderId: fx.rider.id,
      lines: [{ productId: fx.milkBox.id, boxes: 0, units: 50 }],
    })
    const settle = () =>
      settleAssignment(fx.staffA, {
        assignmentId: detail.id,
        deliveredCents: 50_000,
        lines: [{ lineId: detail.lines[0].id, boxes: 0, units: 0 }],
      })
    const results = await Promise.allSettled([settle(), settle(), settle()])
    expect(outcomes(results).filter((s) => s === 'fulfilled')).toHaveLength(1)
    expect(await db.select().from(cashMovements)).toHaveLength(1)
    expect(
      await db
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.type, 'sale')),
    ).toHaveLength(1)
    const [row] = await db.select().from(lots)
    expect(row).toMatchObject({ onHand: 50, reserved: 0 })
  }
})

test('settle and cancel racing: exactly one wins and stock stays consistent', async () => {
  for (let round = 0; round < 3; round++) {
    await resetDatabase(db)
    const fx = await setupRiders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
    const detail = await assignRider(fx.staffA, {
      riderId: fx.rider.id,
      lines: [{ productId: fx.milkBox.id, boxes: 0, units: 50 }],
    })
    const results = await Promise.allSettled([
      settleAssignment(fx.staffA, {
        assignmentId: detail.id,
        deliveredCents: 50_000,
        lines: [{ lineId: detail.lines[0].id, boxes: 0, units: 0 }],
      }),
      cancelAssignment(fx.staffA, { assignmentId: detail.id }),
    ])
    expect(outcomes(results).filter((s) => s === 'fulfilled')).toHaveLength(1)
    const [row] = await db.select().from(lots)
    expect(row.reserved).toBe(0)
    expect([50, 100]).toContain(row.onHand)
  }
})
