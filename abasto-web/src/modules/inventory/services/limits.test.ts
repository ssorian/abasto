import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { createPurchase } from '#/modules/inventory/services/purchases'
import {
  adjustLot,
  registerLoss,
} from '#/modules/inventory/services/stock-adjustments'
import { countStock } from '#/modules/inventory/services/stock-counts'
import { setMinimumStock } from '#/modules/inventory/services/stock-minimums'
import {
  errorOf,
  inventoryState,
  receive,
  setupInventory,
} from '#/modules/inventory/services/testing'

beforeEach(() => resetDatabase(db))

const MAX = 2147483647
const over = MAX + 1

async function rejectsWith(run: () => Promise<unknown>, message: string) {
  const before = await inventoryState()
  const error = await errorOf(run)
  expect(error.code).toBe('invalid')
  expect(error.message).toBe(message)
  expect(await inventoryState()).toEqual(before)
}

describe('int4 limits are validated before reaching the database', () => {
  test('purchase quantity and cost', async () => {
    const fx = await setupInventory()
    const purchase = (quantity: number, totalCostCents: number) => () =>
      createPurchase(fx.owner, {
        supplierId: fx.supplier.id,
        warehouseId: fx.a.id,
        purchasedOn: '2026-11-01',
        lines: [{ productId: fx.milk.id, quantity, totalCostCents }],
      })
    await rejectsWith(
      purchase(over, 0),
      'La cantidad no puede ser mayor que 2147483647.',
    )
    await rejectsWith(
      purchase(1, over),
      'El costo no puede ser mayor que 2147483647 centavos.',
    )
    const lot = (await purchase(MAX, MAX)()).lots[0]
    expect(lot.onHand).toBe(MAX)
  })

  test('adjustment, loss, count and minimum', async () => {
    const fx = await setupInventory()
    const lot = await receive(fx, { quantity: 5 })
    await rejectsWith(
      () => adjustLot(fx.owner, { lotId: lot.id, quantity: over, reason: 'x' }),
      'La cantidad del ajuste no puede ser mayor que 2147483647.',
    )
    await rejectsWith(
      () =>
        adjustLot(fx.owner, { lotId: lot.id, quantity: -over, reason: 'x' }),
      'La cantidad del ajuste no puede ser mayor que 2147483647.',
    )
    await rejectsWith(
      () =>
        registerLoss(fx.owner, {
          lotId: lot.id,
          quantity: over,
          category: 'otro',
          reason: 'x',
        }),
      'La cantidad no puede ser mayor que 2147483647.',
    )
    await rejectsWith(
      () =>
        countStock(fx.owner, {
          productId: fx.milk.id,
          warehouseId: fx.a.id,
          countedQuantity: over,
        }),
      'La cantidad contada no puede ser mayor que 2147483647.',
    )
    await rejectsWith(
      () =>
        setMinimumStock(fx.owner, {
          productId: fx.milk.id,
          warehouseId: fx.a.id,
          minimum: over,
        }),
      'El mínimo no puede ser mayor que 2147483647.',
    )
  })

  test('a lot cannot grow past the maximum', async () => {
    const fx = await setupInventory()
    const lot = await receive(fx, { quantity: MAX })
    await rejectsWith(
      () => adjustLot(fx.owner, { lotId: lot.id, quantity: 1, reason: 'x' }),
      'La existencia del lote no puede ser mayor que 2147483647.',
    )
  })
})
