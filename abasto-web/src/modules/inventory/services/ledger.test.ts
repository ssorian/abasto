import { beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { lots, stockMovements } from '#/modules/inventory/db/schema'
import {
  adjustLot,
  registerLoss,
} from '#/modules/inventory/services/stock-adjustments'
import { countStock } from '#/modules/inventory/services/stock-counts'
import {
  errorOf,
  ledgerSum,
  onHandOf,
  receive,
  setupInventory,
} from '#/modules/inventory/services/testing'

beforeEach(() => resetDatabase(db))

describe('stock ledger', () => {
  test('two simultaneous withdrawals that exceed the lot cannot both succeed', async () => {
    const fx = await setupInventory()
    const lot = await receive(fx, { quantity: 10 })
    const withdraw = () =>
      registerLoss(fx.owner, {
        lotId: lot.id,
        quantity: 6,
        category: 'otro',
        reason: 'x',
      })
    const results = await Promise.allSettled([withdraw(), withdraw()])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const failure = results.find((r) => r.status === 'rejected')
    expect((failure as PromiseRejectedResult).reason.message).toBe(
      'No hay suficiente existencia en ese lote.',
    )
    expect(await onHandOf(lot.id)).toBe(4)
    expect(await ledgerSum(lot.id)).toBe(4)
  })

  test('many concurrent mixed withdrawals never drive on_hand below zero', async () => {
    const fx = await setupInventory()
    const lot = await receive(fx, { quantity: 10 })
    const runs = Array.from({ length: 8 }, (_, index) =>
      index % 2
        ? adjustLot(fx.owner, { lotId: lot.id, quantity: -3, reason: 'x' })
        : registerLoss(fx.owner, {
            lotId: lot.id,
            quantity: 3,
            category: 'otro',
            reason: 'x',
          }),
    )
    const results = await Promise.allSettled(runs)
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3)
    expect(await onHandOf(lot.id)).toBe(1)
    expect(await ledgerSum(lot.id)).toBe(1)
  })

  test('the ledger sum equals on_hand for every lot after a mixed sequence', async () => {
    const fx = await setupInventory()
    const first = await receive(fx, { quantity: 20, expiresOn: '2026-12-01' })
    const second = await receive(fx, { quantity: 10, expiresOn: '2027-01-01' })
    await adjustLot(fx.managerA, {
      lotId: first.id,
      quantity: 5,
      reason: 'Sobrante',
    })
    await registerLoss(fx.managerA, {
      lotId: second.id,
      quantity: 4,
      category: 'dañado',
      reason: 'Golpe',
    })
    await countStock(fx.managerA, {
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      countedQuantity: 12,
    })
    await countStock(fx.managerA, {
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      countedQuantity: 40,
    })
    await errorOf(() =>
      adjustLot(fx.managerA, { lotId: second.id, quantity: -999, reason: 'x' }),
    )
    for (const lot of await db.select().from(lots)) {
      expect(await ledgerSum(lot.id)).toBe(lot.onHand)
    }
    const [{ total }] = await db
      .select({ total: sql<number>`sum(${lots.onHand})::int` })
      .from(lots)
    expect(total).toBe(40)
  })

  test('movements cannot be updated or deleted', async () => {
    const fx = await setupInventory()
    const lot = await receive(fx, { quantity: 10 })
    const update = await errorOf(() =>
      db
        .update(stockMovements)
        .set({ quantity: 99 })
        .where(eq(stockMovements.lotId, lot.id)),
    )
    expect(String(update.cause ?? update.message)).toContain('append-only')
    const remove = await errorOf(() =>
      db.delete(stockMovements).where(eq(stockMovements.lotId, lot.id)),
    )
    expect(String(remove.cause ?? remove.message)).toContain('append-only')
    expect(await ledgerSum(lot.id)).toBe(10)
  })

  test('the database refuses a negative on_hand even when bypassing the services', async () => {
    const fx = await setupInventory()
    const lot = await receive(fx, { quantity: 10 })
    const error = await errorOf(() =>
      db.update(lots).set({ onHand: -1 }).where(eq(lots.id, lot.id)),
    )
    expect(String(error.cause ?? error.message)).toContain('lots_on_hand_min')
    expect(await onHandOf(lot.id)).toBe(10)
  })
})
