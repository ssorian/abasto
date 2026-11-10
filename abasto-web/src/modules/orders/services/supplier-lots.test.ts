import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { createCustomer } from '#/modules/customers/services/customers'
import {
  createSupplierOrder,
  getSupplierOrder,
  receiveSupplierOrder,
} from '#/modules/inventory/services/supplier-orders'
import {
  boxOf,
  lineFor,
  setupSupplierOrders,
} from '#/modules/inventory/services/supplier-testing'
import type { SupplierFixture } from '#/modules/inventory/services/supplier-testing'
import { createOrder } from '#/modules/orders/services/orders'
import { setPrices } from '#/modules/pricing/services/prices'

beforeEach(() => resetDatabase(db))

/** Orders and fully receives `boxes` boxes of one product; returns its lot. */
async function arrive(
  fx: SupplierFixture,
  product: SupplierFixture['milk'],
  boxes: number,
) {
  const created = await createSupplierOrder(fx.owner, {
    supplierId: fx.supplier.id,
    warehouseId: fx.a.id,
    lines: [lineFor(product, boxes)],
  })
  const order = await getSupplierOrder(fx.owner, created.id)
  const received = await receiveSupplierOrder(fx.owner, {
    purchaseId: order.id,
    lines: [
      {
        lineId: order.lines[0].id,
        missingBoxes: 0,
        damagedBoxes: 0,
        noExpiry: true,
      },
    ],
  })
  return received.lots[0]
}

async function sell(
  fx: SupplierFixture,
  customerId: string,
  product: SupplierFixture['milk'],
  quantity: number,
) {
  return createOrder(fx.staffA, {
    warehouseId: fx.a.id,
    customerId,
    lines: [{ presentationId: boxOf(product).id, quantity }],
  })
}

describe('selling from lots created by receiveSupplierOrder', () => {
  test('FIFO takes the oldest received lot and charges its frozen price', async () => {
    const fx = await setupSupplierOrders()
    const customer = await createCustomer(fx.owner, { name: 'Cliente' })
    const oldest = await arrive(fx, fx.milk, 4) // standard 2000 ≥ cost 1344: frozen at 2000
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: boxOf(fx.milk).id, priceCents: 2500 }],
    })
    const newer = await arrive(fx, fx.milk, 10) // frozen at 2500
    expect([oldest.salePriceCents, newer.salePriceCents]).toEqual([2000, 2500])

    const placed = await sell(fx, customer.id, fx.milk, 6)
    expect(placed.lines[0]).toMatchObject({
      unitPriceCents: 2000,
      lineTotalCents: 12000,
    })
    const taken = Object.fromEntries(
      placed.lines[0].allocations.map((row) => [row.lotId, row.quantity]),
    )
    expect(taken).toEqual({ [oldest.id]: 48, [newer.id]: 24 })

    // The oldest lot is gone: the next sale is charged the newer lot's price.
    const next = await sell(fx, customer.id, fx.milk, 1)
    expect(next.lines[0].unitPriceCents).toBe(2500)
  })

  test('a lot whose cost exceeds the standard follows the standard price', async () => {
    const fx = await setupSupplierOrders()
    const customer = await createCustomer(fx.owner, { name: 'Cliente' })
    // Soda costs 2016 per box and the standard is 1500: the lot has no own price.
    const lot = await arrive(fx, fx.soda, 3)
    expect(lot.salePriceCents).toBeNull()
    const placed = await sell(fx, customer.id, fx.soda, 2)
    expect(placed.lines[0]).toMatchObject({
      unitPriceCents: 1500,
      lineTotalCents: 3000,
    })
    expect(placed.lines[0].allocations[0].lotId).toBe(lot.id)
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: boxOf(fx.soda).id, priceCents: 1800 }],
    })
    const later = await sell(fx, customer.id, fx.soda, 1)
    expect(later.lines[0].unitPriceCents).toBe(1800)
  })
})
