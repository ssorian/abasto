import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { cancelOrder } from '#/modules/orders/services/order-actions'
import { createOrder } from '#/modules/orders/services/orders'
import { orders } from '#/modules/orders/db/schema'
import { getOrder } from '#/modules/orders/services/order-reads'
import {
  advance,
  setupOrders,
  useClock,
} from '#/modules/orders/services/testing'
import {
  adjustLot,
  registerLoss,
} from '#/modules/inventory/services/stock-adjustments'
import { countStock } from '#/modules/inventory/services/stock-counts'
import { getWarehouseStock } from '#/modules/inventory/services/stock-reads'
import {
  errorOf,
  inventoryState,
  onHandOf,
  receive,
} from '#/modules/inventory/services/testing'

beforeEach(() => resetDatabase(db))

const held = 'Ese lote tiene unidades apartadas para pedidos.'

async function setup() {
  const fx = await setupOrders()
  const lot = await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
  const order = await createOrder(fx.staffA, {
    warehouseId: fx.a.id,
    customerId: fx.customer.id,
    lines: [{ presentationId: fx.pieceId, quantity: 6 }],
  })
  return { fx, lot, order }
}

describe('reserved stock', () => {
  test('the stock read model reports real reserved and available', async () => {
    const { fx } = await setup()
    const [row] = await getWarehouseStock(fx.staffA, fx.a.id)
    expect(row).toMatchObject({ onHand: 10, reserved: 6, available: 4 })
  })

  test('available below the minimum flags the product', async () => {
    const { fx } = await setup()
    const { setMinimumStock } =
      await import('#/modules/inventory/services/stock-minimums')
    await setMinimumStock(fx.owner, {
      productId: fx.milkBox.id,
      warehouseId: fx.a.id,
      minimum: 5,
    })
    const [row] = await getWarehouseStock(fx.staffA, fx.a.id)
    expect(row.belowMinimum).toBe(true)
  })

  test('adjustments and losses cannot take reserved units', async () => {
    const { fx, lot } = await setup()
    const before = await inventoryState()
    const adjust = await errorOf(() =>
      adjustLot(fx.owner, { lotId: lot.id, quantity: -5, reason: 'merma' }),
    )
    expect([adjust.code, adjust.message]).toEqual(['conflict', held])
    const loss = await errorOf(() =>
      registerLoss(fx.owner, {
        lotId: lot.id,
        quantity: 5,
        category: 'dañado',
        reason: 'x',
      }),
    )
    expect([loss.code, loss.message]).toEqual(['conflict', held])
    expect(await inventoryState()).toEqual(before)
  })

  test('available units can still be withdrawn; asking for more than on hand keeps the old message', async () => {
    const { fx, lot } = await setup()
    await adjustLot(fx.owner, { lotId: lot.id, quantity: -4, reason: 'merma' })
    expect(await onHandOf(lot.id)).toBe(6)
    const more = await errorOf(() =>
      adjustLot(fx.owner, { lotId: lot.id, quantity: -20, reason: 'x' }),
    )
    expect(more.message).toBe('No hay suficiente existencia en ese lote.')
  })

  test('a count below the reserved units is refused; at or above it works', async () => {
    const { fx } = await setup()
    const before = await inventoryState()
    const error = await errorOf(() =>
      countStock(fx.owner, {
        productId: fx.milkBox.id,
        warehouseId: fx.a.id,
        countedQuantity: 5,
      }),
    )
    expect([error.code, error.message]).toEqual(['conflict', held])
    expect(await inventoryState()).toEqual(before)
    const ok = await countStock(fx.owner, {
      productId: fx.milkBox.id,
      warehouseId: fx.a.id,
      countedQuantity: 6,
    })
    expect(ok.difference).toBe(-4)
  })

  test('cancelling the order frees the units for withdrawal', async () => {
    const { fx, lot, order } = await setup()
    await cancelOrder(fx.staffA, order.id)
    await adjustLot(fx.owner, { lotId: lot.id, quantity: -10, reason: 'merma' })
    expect(await onHandOf(lot.id)).toBe(0)
  })
})

describe('stock read with expiry', () => {
  afterEach(() => useClock(null))

  test('reports past-expiry units apart and keeps them out of available', async () => {
    const { fx } = await setup()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 3,
      expiresOn: '2020-01-01',
    })
    const [row] = await getWarehouseStock(fx.staffA, fx.a.id)
    expect(row).toMatchObject({
      onHand: 13,
      reserved: 6,
      expired: 3,
      available: 4,
    })
  })

  test('units reserved on a past-expiry lot are not subtracted twice', async () => {
    const fx = await setupOrders()
    const lot = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 5,
      expiresOn: '2098-12-01',
    })
    await receive(fx, { productId: fx.milkBox.id, quantity: 4 })
    useClock(() => new Date('2098-12-01T18:00:00Z'))
    await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 2 }],
    })
    useClock(() => new Date('2098-12-02T12:00:00Z'))
    const [row] = await getWarehouseStock(fx.staffA, fx.a.id)
    expect(lot.id).toBeDefined()
    expect(row).toMatchObject({
      onHand: 9,
      reserved: 2,
      expired: 5,
      available: 4,
    })
  })

  test('overdue orders expire before the read, giving their units back', async () => {
    const { fx, order } = await setup()
    advance(25)
    const [row] = await getWarehouseStock(fx.staffA, fx.a.id)
    expect(row).toMatchObject({ onHand: 10, reserved: 0, available: 10 })
    expect((await getOrder(fx.staffA, order.id)).status).toBe('Vencido')
  })
})

describe('createPurchase and expiry', () => {
  afterEach(() => useClock(null))

  test('a purchase expires overdue orders of the warehouse first', async () => {
    const { fx, order } = await setup()
    advance(25)
    await receive(fx, { productId: fx.milkBox.id, quantity: 5 })
    const [row] = await getWarehouseStock(fx.staffA, fx.a.id)
    expect(row).toMatchObject({ onHand: 15, reserved: 0 })
    const stored = await db.select().from(orders).where(eq(orders.id, order.id))
    expect(stored[0].status).toBe('Vencido')
  })
})
