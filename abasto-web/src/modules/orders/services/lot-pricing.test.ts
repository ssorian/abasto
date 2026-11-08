import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { previewQuote } from '#/modules/counter/server/quote-preview'
import { createOrder } from '#/modules/orders/services/orders'
import {
  receive,
  setupOrders,
  useClock,
} from '#/modules/orders/services/testing'
import type { OrdersFixture } from '#/modules/orders/services/testing'
import { setPrices } from '#/modules/pricing/services/prices'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

/** Water is sold by the box (12 pieces) by default. */
const boxes = (count: number) => count * 12

/** Oldest lot: 4 boxes at $30.00 each, sold at $34.00; newer: 20 boxes sold at $36.00. */
async function twoLots(fx: OrdersFixture) {
  const oldest = await receive(fx, {
    productId: fx.water.id,
    quantity: boxes(4),
    totalCostCents: 12000,
    salePriceCents: 3400,
  })
  const newer = await receive(fx, {
    productId: fx.water.id,
    quantity: boxes(20),
    totalCostCents: 64000,
    salePriceCents: 3600,
  })
  return { oldest, newer }
}

const order = (fx: OrdersFixture, quantity: number) =>
  createOrder(fx.staffA, {
    warehouseId: fx.a.id,
    customerId: fx.customer.id,
    lines: [{ presentationId: fx.box(fx.water).id, quantity }],
  })

const preview = (fx: OrdersFixture, quantity: number) =>
  previewQuote(fx.staffA, {
    warehouseId: fx.a.id,
    customerId: fx.customer.id,
    lines: [{ presentationId: fx.box(fx.water).id, quantity }],
  })

describe('orders priced by the oldest lot (FIFO)', () => {
  test('a line inside the oldest lot is charged that lot price', async () => {
    const fx = await setupOrders()
    const { oldest } = await twoLots(fx)
    const placed = await order(fx, 4)
    expect(placed.lines[0]).toMatchObject({
      listPriceCents: 3400,
      unitPriceCents: 3400,
      lineTotalCents: 13600,
    })
    expect(placed.lines[0].allocations).toEqual([
      expect.objectContaining({ lotId: oldest.id, quantity: boxes(4) }),
    ])
  })

  test('a line spanning two lots is charged entirely at the oldest lot price', async () => {
    const fx = await setupOrders()
    const { oldest, newer } = await twoLots(fx)
    const placed = await order(fx, 10)
    expect(placed.lines[0]).toMatchObject({
      unitPriceCents: 3400,
      lineTotalCents: 34000,
    })
    const taken = Object.fromEntries(
      placed.lines[0].allocations.map((a) => [a.lotId, a.quantity]),
    )
    expect(taken).toEqual({ [oldest.id]: boxes(4), [newer.id]: boxes(6) })
  })

  test('once the oldest lot is taken, the next lot price applies', async () => {
    const fx = await setupOrders()
    await twoLots(fx)
    await order(fx, 4)
    const next = await order(fx, 2)
    expect(next.lines[0]).toMatchObject({
      unitPriceCents: 3600,
      lineTotalCents: 7200,
    })
  })

  test('takes the oldest received lot first even when a newer one expires earlier', async () => {
    const fx = await setupOrders()
    const first = await receive(fx, {
      productId: fx.water.id,
      quantity: boxes(2),
      totalCostCents: 6000,
      salePriceCents: 3400,
      expiresOn: '2099-06-01',
    })
    await receive(fx, {
      productId: fx.water.id,
      quantity: boxes(2),
      totalCostCents: 6000,
      salePriceCents: 3600,
      expiresOn: '2099-01-01',
    })
    const placed = await order(fx, 1)
    expect(placed.lines[0].unitPriceCents).toBe(3400)
    expect(placed.lines[0].allocations[0].lotId).toBe(first.id)
  })

  test('an expired oldest lot is skipped, and its price with it', async () => {
    const fx = await setupOrders()
    // 12:00 in Mexico City on 2097-01-10.
    useClock(() => new Date('2097-01-10T18:00:00Z'))
    await receive(fx, {
      productId: fx.water.id,
      quantity: boxes(2),
      totalCostCents: 6000,
      salePriceCents: 3400,
      expiresOn: '2097-01-09',
    })
    const fresh = await receive(fx, {
      productId: fx.water.id,
      quantity: boxes(2),
      totalCostCents: 6000,
      salePriceCents: 3600,
    })
    const placed = await order(fx, 1)
    expect(placed.lines[0].unitPriceCents).toBe(3600)
    expect(placed.lines[0].allocations[0].lotId).toBe(fresh.id)
  })

  test('a lot without its own sale price sells at the standard price', async () => {
    const fx = await setupOrders()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.box(fx.water).id, priceCents: 3500 }],
    })
    await receive(fx, {
      productId: fx.water.id,
      quantity: boxes(2),
      totalCostCents: 6000,
    })
    const placed = await order(fx, 1)
    expect(placed.lines[0].unitPriceCents).toBe(3500)
  })

  test('a presentation other than the default keeps the standard price', async () => {
    const fx = await setupOrders()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.piece(fx.water).id, priceCents: 300 }],
    })
    await twoLots(fx)
    const placed = await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.piece(fx.water).id, quantity: 5 }],
    })
    expect(placed.lines[0].unitPriceCents).toBe(300)
  })

  test('the counter preview shows the price the order then freezes', async () => {
    const fx = await setupOrders()
    await twoLots(fx)
    const before = await preview(fx, 10)
    expect(before.lines[0]).toMatchObject({
      listPriceCents: 3400,
      unitPriceCents: 3400,
      lineTotalCents: 34000,
    })
    const placed = await order(fx, 10)
    expect(placed.totalCents).toBe(before.totalCents)
    const after = await preview(fx, 1)
    expect(after.lines[0].unitPriceCents).toBe(3600)
  })
})
