import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { setMinimumStock } from '#/modules/inventory/services/stock-minimums'
import { getWarehouseStock } from '#/modules/inventory/services/stock-reads'
import { adjustLot } from '#/modules/inventory/services/stock-adjustments'
import {
  errorOf,
  receive,
  setupInventory,
} from '#/modules/inventory/services/testing'

beforeEach(() => resetDatabase(db))

describe('getWarehouseStock', () => {
  test('totals per product with lots ordered earliest expiry first, empty lots hidden', async () => {
    const fx = await setupInventory()
    const none = await receive(fx, { quantity: 4, lotCode: 'SIN' })
    const late = await receive(fx, {
      quantity: 6,
      expiresOn: '2027-01-01',
      lotCode: 'TARDE',
    })
    const early = await receive(fx, {
      quantity: 3,
      expiresOn: '2026-12-01',
      lotCode: 'PRONTO',
    })
    const emptied = await receive(fx, { quantity: 2, expiresOn: '2026-11-15' })
    await adjustLot(fx.owner, {
      lotId: emptied.id,
      quantity: -2,
      reason: 'Merma',
    })
    await receive(fx, { warehouseId: fx.b.id, quantity: 50 })
    await setMinimumStock(fx.owner, {
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      minimum: 14,
    })

    const stock = await getWarehouseStock(fx.clerkA, fx.a.id)
    expect(stock).toHaveLength(1)
    const [row] = stock
    expect(row).toMatchObject({
      productId: fx.milk.id,
      name: 'Leche 1L',
      sku: 'LEC-1',
      unit: 'piezas',
      onHand: 13,
      reserved: 0,
      available: 13,
      minimum: 14,
      belowMinimum: true,
    })
    expect(row.lots.map((lot) => lot.id)).toEqual([early.id, late.id, none.id])
    expect(row.lots[0]).toMatchObject({
      code: 'PRONTO',
      expiresOn: '2026-12-01',
      onHand: 3,
    })
  })

  test('a product at its minimum is not below it; minimum zero never flags', async () => {
    const fx = await setupInventory()
    await receive(fx, { quantity: 10 })
    await receive(fx, { productId: fx.soda.id, quantity: 1 })
    await setMinimumStock(fx.owner, {
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      minimum: 10,
    })
    const stock = await getWarehouseStock(fx.owner, fx.a.id)
    expect(stock.map((row) => row.belowMinimum)).toEqual([false, false])
  })

  test('a clerk reads their own warehouse only', async () => {
    const fx = await setupInventory()
    const error = await errorOf(() => getWarehouseStock(fx.clerkA, fx.b.id))
    expect([error.code, error.message]).toEqual([
      'forbidden',
      'No tienes permiso para esta acción.',
    ])
  })
})
