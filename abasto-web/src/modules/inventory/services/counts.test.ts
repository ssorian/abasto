import { beforeEach, describe, expect, test } from 'bun:test'
import { eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import type { AppErrorCode } from '#/lib/errors'
import {
  lots,
  stockCounts,
  stockMovements,
} from '#/modules/inventory/db/schema'
import { createPurchase } from '#/modules/inventory/services/purchases'
import { countStock } from '#/modules/inventory/services/stock-counts'
import {
  errorOf,
  inventoryState,
  ledgerSum,
  onHandOf,
  receive,
  setupInventory,
} from '#/modules/inventory/services/testing'

beforeEach(() => resetDatabase(db))

const tieReceivedAt = (ids: Array<string>) =>
  db
    .update(lots)
    .set({ receivedAt: new Date('2026-11-01T12:00:00Z') })
    .where(inArray(lots.id, ids))

const forbidden = 'No tienes permiso para esta acción.'

/** Three lots of the same product: early expiry (5), late expiry (5) and no expiry (5, received last). */
async function setup() {
  const fx = await setupInventory()
  const early = await receive(fx, { quantity: 5, expiresOn: '2026-12-01' })
  const late = await receive(fx, { quantity: 5, expiresOn: '2027-03-01' })
  const none = await receive(fx, { quantity: 5 })
  return { fx, early, late, none }
}

const count = (
  fx: Awaited<ReturnType<typeof setup>>['fx'],
  countedQuantity: number,
  actor = fx.managerA,
) =>
  countStock(actor, {
    productId: fx.milk.id,
    warehouseId: fx.a.id,
    countedQuantity,
    note: 'Conteo mensual',
  })

async function rejects(
  run: () => Promise<unknown>,
  code: AppErrorCode,
  message: string,
) {
  const before = await inventoryState()
  const error = await errorOf(run)
  expect(error.code).toBe(code)
  expect(error.message).toBe(message)
  expect(await inventoryState()).toEqual(before)
}

describe('countStock', () => {
  test('a shortage is taken from the earliest expiry first, then the next', async () => {
    const { fx, early, late, none } = await setup()
    const result = await count(fx, 8)
    expect(result).toMatchObject({ expected: 15, counted: 8, difference: -7 })
    expect(await onHandOf(early.id)).toBe(0)
    expect(await onHandOf(late.id)).toBe(3)
    expect(await onHandOf(none.id)).toBe(5)
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.type, 'count'))
    expect(movements.map((m) => m.quantity).sort((x, y) => x - y)).toEqual([
      -5, -2,
    ])
    expect(movements.every((m) => m.reference === result.id)).toBe(true)
    for (const lot of [early, late, none]) {
      expect(await ledgerSum(lot.id)).toBe(await onHandOf(lot.id))
    }
  })

  test('lots with no expiry are consumed last', async () => {
    const { fx, early, late, none } = await setup()
    await count(fx, 3)
    expect(await onHandOf(early.id)).toBe(0)
    expect(await onHandOf(late.id)).toBe(0)
    expect(await onHandOf(none.id)).toBe(3)
  })

  test('a surplus goes to the most recently received lot', async () => {
    const { fx, early, none } = await setup()
    const result = await count(fx, 18)
    expect(result.difference).toBe(3)
    expect(await onHandOf(none.id)).toBe(8)
    expect(await onHandOf(early.id)).toBe(5)
    expect(await ledgerSum(none.id)).toBe(8)
  })

  test('a surplus is deterministic when lots tie on received_at: later expiry wins', async () => {
    const fx = await setupInventory()
    const purchase = await createPurchase(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      purchasedOn: '2026-11-01',
      lines: [
        {
          productId: fx.milk.id,
          quantity: 5,
          totalCostCents: 100,
          expiresOn: '2026-12-01',
        },
        {
          productId: fx.milk.id,
          quantity: 5,
          totalCostCents: 100,
          expiresOn: '2027-03-01',
        },
        { productId: fx.milk.id, quantity: 5, totalCostCents: 100 },
      ],
    })
    const [early, late, none] = purchase.lots
    // Lots of one purchase get distinct clock_timestamp() times; force the tie
    // this rule is about (e.g. lots received in the same instant).
    await tieReceivedAt(purchase.lots.map((lot) => lot.id))
    await count(fx, 20)
    // No expiry counts as the latest expiry; the other two are untouched.
    expect(await onHandOf(none.id)).toBe(10)
    expect(await onHandOf(early.id)).toBe(5)
    expect(await onHandOf(late.id)).toBe(5)
  })

  test('with the same expiry too, ties break by the highest lot id', async () => {
    const fx = await setupInventory()
    const purchase = await createPurchase(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      purchasedOn: '2026-11-01',
      lines: [
        { productId: fx.milk.id, quantity: 5, totalCostCents: 100 },
        { productId: fx.milk.id, quantity: 5, totalCostCents: 100 },
      ],
    })
    await tieReceivedAt(purchase.lots.map((lot) => lot.id))
    const expected = [...purchase.lots].sort((a, b) =>
      a.id < b.id ? 1 : -1,
    )[0]
    await count(fx, 12)
    expect(await onHandOf(expected.id)).toBe(7)
  })

  test('a matching count only records the count', async () => {
    const { fx } = await setup()
    const before = await inventoryState()
    const result = await count(fx, 15)
    expect(result.difference).toBe(0)
    const after = await inventoryState()
    expect(after.lots).toEqual(before.lots)
    expect(after.movements).toBe(before.movements)
    expect(after.counts).toBe(1)
    const [saved] = await db.select().from(stockCounts)
    expect(saved).toMatchObject({
      expectedQuantity: 15,
      countedQuantity: 15,
      note: 'Conteo mensual',
      actorId: fx.managerA.userId,
    })
  })

  test('counting zero empties the product in that warehouse only', async () => {
    const { fx } = await setup()
    const other = await receive(fx, { warehouseId: fx.b.id, quantity: 4 })
    await count(fx, 0)
    expect(await onHandOf(other.id)).toBe(4)
  })

  test('rejects a negative or fractional counted quantity', async () => {
    const { fx } = await setup()
    for (const value of [-1, 2.5]) {
      await rejects(
        () => count(fx, value),
        'invalid',
        'La cantidad contada debe ser cero o mayor.',
      )
    }
  })

  test('rejects a surplus when the product has no lot in the warehouse', async () => {
    const fx = await setupInventory()
    await rejects(
      () =>
        countStock(fx.managerA, {
          productId: fx.milk.id,
          warehouseId: fx.a.id,
          countedQuantity: 5,
        }),
      'conflict',
      'No hay lotes de este producto en el almacén para registrar el excedente.',
    )
  })

  test('rejects an unknown product or warehouse', async () => {
    const { fx } = await setup()
    await rejects(
      () =>
        countStock(fx.owner, {
          productId: crypto.randomUUID(),
          warehouseId: fx.a.id,
          countedQuantity: 1,
        }),
      'not_found',
      'No encontramos ese producto.',
    )
    await rejects(
      () =>
        countStock(fx.owner, {
          productId: fx.milk.id,
          warehouseId: crypto.randomUUID(),
          countedQuantity: 1,
        }),
      'not_found',
      'No encontramos ese almacén.',
    )
  })

  test('a clerk, and the manager of another warehouse, cannot count', async () => {
    const { fx } = await setup()
    for (const actor of [fx.clerkA, fx.managerB]) {
      await rejects(() => count(fx, 1, actor), 'forbidden', forbidden)
    }
  })
})
