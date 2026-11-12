import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import {
  createProduct,
  updateProduct,
} from '#/modules/catalog/services/products'
import { resetDatabase } from '#/db/testing'
import { setMinimumStock } from '#/modules/inventory/services/stock-minimums'
import {
  getWarehouseStock,
  listStockMovements,
} from '#/modules/inventory/services/stock-reads'
import { countStock } from '#/modules/inventory/services/stock-counts'
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

    const stock = await getWarehouseStock(fx.staffA, fx.a.id)
    expect(stock.map((item) => item.productId)).toEqual([
      fx.milk.id,
      fx.soda.id,
    ])
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

  test('carries the product photo, null when it has none', async () => {
    const fx = await setupInventory()
    await updateProduct(fx.owner, fx.soda.id, {
      imageUrl: 'https://example.com/soda.png',
    })
    const stock = await getWarehouseStock(fx.staffA, fx.a.id)
    expect(stock.map(({ name, imageUrl }) => ({ name, imageUrl }))).toEqual([
      { name: 'Leche 1L', imageUrl: null },
      { name: fx.soda.name, imageUrl: 'https://example.com/soda.png' },
    ])
  })

  test('lists every published product with zero stock; unpublished ones only with lots or a minimum', async () => {
    const fx = await setupInventory()
    await updateProduct(fx.owner, fx.soda.id, { published: false })
    const fresh = await createProduct(fx.owner, {
      name: 'Yogurt',
      sku: 'YOG-1',
      category: 'Lácteos',
      unit: 'piezas',
      presentations: [{ name: 'Pieza', factor: 1 }],
      defaultIndex: 0,
    })
    const stock = await getWarehouseStock(fx.staffA, fx.a.id)
    expect(stock.map((row) => row.name)).toEqual(['Leche 1L', 'Yogurt'])
    expect(stock.find((row) => row.productId === fresh.id)).toMatchObject({
      onHand: 0,
      reserved: 0,
      available: 0,
      minimum: 0,
      belowMinimum: false,
      lots: [],
    })
    await setMinimumStock(fx.owner, {
      productId: fresh.id,
      warehouseId: fx.a.id,
      minimum: 5,
    })
    await setMinimumStock(fx.owner, {
      productId: fx.soda.id,
      warehouseId: fx.a.id,
      minimum: 2,
    })
    const after = await getWarehouseStock(fx.staffA, fx.a.id)
    expect(
      after.map((row) => [row.name, row.minimum, row.belowMinimum]),
    ).toEqual([
      ['Leche 1L', 0, false],
      ['Refresco 600ml', 2, true],
      ['Yogurt', 5, true],
    ])
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

  test('staff read their own warehouse only', async () => {
    const fx = await setupInventory()
    const error = await errorOf(() => getWarehouseStock(fx.staffA, fx.b.id))
    expect([error.code, error.message]).toEqual([
      'forbidden',
      'No tienes permiso para esta acción.',
    ])
  })
})

describe('listStockMovements', () => {
  async function history() {
    const fx = await setupInventory()
    const milkLot = await receive(fx, { quantity: 10, lotCode: 'L-1' })
    const sodaLot = await receive(fx, {
      productId: fx.soda.id,
      quantity: 8,
      lotCode: 'S-1',
    })
    await adjustLot(fx.managerA, {
      lotId: milkLot.id,
      quantity: -3,
      reason: 'Se cayó',
    })
    await countStock(fx.managerA, {
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      countedQuantity: 9,
    })
    await receive(fx, { warehouseId: fx.b.id, quantity: 50 })
    return { fx, milkLot, sodaLot }
  }

  test('lists the warehouse ledger newest first with signed quantity, reason, actor and lot code', async () => {
    const { fx } = await history()
    const rows = await listStockMovements(fx.staffA, { warehouseId: fx.a.id })
    expect(rows.map((row) => [row.type, row.quantity])).toEqual([
      ['count', 2],
      ['adjustment', -3],
      ['purchase', 8],
      ['purchase', 10],
    ])
    expect(rows[1]).toMatchObject({
      reason: 'Se cayó',
      actorName: 'gerente-a',
      lotCode: 'L-1',
    })
    expect(rows[1].createdAt).toBeInstanceOf(Date)
    expect(rows[3].reference).toBeString()
    expect(rows[3].actorName).toBe('Dueño')
  })

  test('filters by product and by lot, and limits the result', async () => {
    const { fx, milkLot, sodaLot } = await history()
    const soda = await listStockMovements(fx.owner, {
      warehouseId: fx.a.id,
      productId: fx.soda.id,
    })
    expect(soda.map((row) => row.lotCode)).toEqual(['S-1'])
    const byLot = await listStockMovements(fx.owner, {
      warehouseId: fx.a.id,
      lotId: milkLot.id,
    })
    expect(byLot).toHaveLength(3)
    const other = await listStockMovements(fx.owner, {
      warehouseId: fx.a.id,
      lotId: sodaLot.id,
      productId: fx.milk.id,
    })
    expect(other).toHaveLength(0)
    const limited = await listStockMovements(fx.owner, {
      warehouseId: fx.a.id,
      limit: 2,
    })
    expect(limited.map((row) => row.type)).toEqual(['count', 'adjustment'])
  })

  test('needs warehouse.view for that warehouse', async () => {
    const { fx } = await history()
    const error = await errorOf(() =>
      listStockMovements(fx.staffA, { warehouseId: fx.b.id }),
    )
    expect(error.code).toBe('forbidden')
  })
})
