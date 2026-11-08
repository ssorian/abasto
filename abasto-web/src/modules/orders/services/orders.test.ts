import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import type { AppErrorCode } from '#/lib/errors'
import { resetDatabase } from '#/db/testing'
import { saveCommercialRules } from '#/modules/customers/services/commercial-rules'
import { updateCustomer } from '#/modules/customers/services/customers'
import { createOrder } from '#/modules/orders/services/orders'
import { getOrder } from '#/modules/orders/services/order-reads'
import {
  errorOf,
  orderState,
  receive,
  setupOrders,
  useClock,
} from '#/modules/orders/services/testing'
import { setPrices } from '#/modules/pricing/services/prices'
import { adjustLot } from '#/modules/inventory/services/stock-adjustments'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

type Fx = Awaited<ReturnType<typeof setupOrders>>
const line = (presentationId: string, quantity: number) => ({
  presentationId,
  quantity,
})
const place = (
  fx: Fx,
  lines: Array<ReturnType<typeof line>>,
  actor = fx.staffA,
) =>
  createOrder(actor, {
    warehouseId: fx.a.id,
    customerId: fx.customer.id,
    lines,
  })

async function rejects(
  fx: Fx,
  run: () => Promise<unknown>,
  code: AppErrorCode,
  message: string,
) {
  const before = await orderState()
  const error = await errorOf(run)
  expect(error.code).toBe(code)
  expect(error.message).toBe(message)
  expect(await orderState()).toEqual(before)
  return fx
}

describe('createOrder', () => {
  test('reserves stock, freezes the price and sets the expiry', async () => {
    const fx = await setupOrders()
    const lot = await receive(fx, { productId: fx.milkBox.id, quantity: 50 })
    const before = Date.now()
    const order = await place(fx, [line(fx.pieceId, 10)])
    expect(order).toMatchObject({
      status: 'Reservado',
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      totalCents: 10000,
    })
    expect(order.lines).toHaveLength(1)
    expect(order.lines[0]).toMatchObject({
      quantity: 10,
      baseQuantity: 10,
      listPriceCents: 1000,
      unitPriceCents: 1000,
      lineTotalCents: 10000,
      rule: null,
    })
    expect(order.lines[0].allocations).toEqual([
      expect.objectContaining({ lotId: lot.id, quantity: 10 }),
    ])
    const hours = (order.expiresAt.getTime() - before) / 3_600_000
    expect(hours).toBeGreaterThan(23.99)
    expect(hours).toBeLessThan(24.01)
    const [row] = (await orderState()).lots
    expect(row).toMatchObject({ onHand: 50, reserved: 10 })
  })

  test('a later list price change does not change the order', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 50 })
    const order = await place(fx, [line(fx.pieceId, 4)])
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.pieceId, priceCents: 5000 }],
    })
    const read = await getOrder(fx.staffA, order.id)
    expect(read.totalCents).toBe(4000)
    expect(read.lines[0]).toMatchObject({
      unitPriceCents: 1000,
      lineTotalCents: 4000,
    })
  })

  test('applies the customer rule and records it', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
    await saveCommercialRules(fx.owner, fx.customer.id, [
      { presentationId: fx.pieceId, minQuantity: 10, discountBps: 1000 },
    ])
    const order = await place(fx, [line(fx.pieceId, 10), line(fx.boxId, 2)])
    const piece = order.lines.find((l) => l.presentationId === fx.pieceId)!
    expect(piece).toMatchObject({
      listPriceCents: 1000,
      unitPriceCents: 900,
      lineTotalCents: 9000,
      rule: { minQuantity: 10, discountBps: 1000, priceCents: null },
    })
    // The box has no own price: it derives 12000 from the piece price, no rule.
    const box = order.lines.find((l) => l.presentationId === fx.boxId)!
    expect(box).toMatchObject({
      unitPriceCents: 12000,
      baseQuantity: 24,
      rule: null,
    })
    expect(order.totalCents).toBe(9000 + 24000)
  })

  test('rejects a presentation without a price in the warehouse', async () => {
    const fx = await setupOrders()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 50,
      warehouseId: fx.b.id,
    })
    await rejects(
      fx,
      () =>
        createOrder(fx.owner, {
          warehouseId: fx.b.id,
          customerId: fx.customer.id,
          lines: [line(fx.pieceId, 1)],
        }),
      'conflict',
      'Este producto no tiene precio en este almacén.',
    )
  })

  test('rejects a line whose final price is zero', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 50 })
    await saveCommercialRules(fx.owner, fx.customer.id, [
      { presentationId: fx.pieceId, minQuantity: 1, discountBps: 10000 },
    ])
    await rejects(
      fx,
      () => place(fx, [line(fx.pieceId, 1)]),
      'conflict',
      'El precio final de la línea debe ser mayor que cero.',
    )
  })

  test('rejects when there is not enough available stock', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
    await place(fx, [line(fx.pieceId, 8)])
    await rejects(
      fx,
      () => place(fx, [line(fx.pieceId, 3)]),
      'conflict',
      'No hay suficiente existencia disponible de Leche entera 1L.',
    )
  })

  test('a failing line rolls back the lines before it', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
    await rejects(
      fx,
      () => place(fx, [line(fx.pieceId, 5), line(fx.boxId, 50)]),
      'conflict',
      'No hay suficiente existencia disponible de Leche entera 1L.',
    )
  })

  test('allocates FIFO across lots, oldest received first', async () => {
    const fx = await setupOrders()
    const late = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      expiresOn: '2099-03-01',
    })
    const early = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 6,
      expiresOn: '2098-12-01',
    })
    const none = await receive(fx, { productId: fx.milkBox.id, quantity: 20 })
    const order = await place(fx, [line(fx.pieceId, 20)])
    const taken = Object.fromEntries(
      order.lines[0].allocations.map((a) => [a.lotId, a.quantity]),
    )
    expect(taken).toEqual({ [late.id]: 10, [early.id]: 6, [none.id]: 4 })
    const state = Object.fromEntries(
      (await orderState()).lots.map((l) => [l.id, l.reserved]),
    )
    expect(state).toEqual({ [late.id]: 10, [early.id]: 6, [none.id]: 4 })
  })

  test('lots past their expiry date are never sold; a lot expiring today still is', async () => {
    const fx = await setupOrders()
    // 12:00 in Mexico City on 2097-01-10.
    useClock(() => new Date('2097-01-10T18:00:00Z'))
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      expiresOn: '2097-01-09',
    })
    const today = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 5,
      expiresOn: '2097-01-10',
    })
    const order = await place(fx, [line(fx.pieceId, 5)])
    expect(order.lines[0].allocations).toEqual([
      expect.objectContaining({ lotId: today.id, quantity: 5 }),
    ])
    await rejects(
      fx,
      () => place(fx, [line(fx.pieceId, 1)]),
      'conflict',
      'No hay suficiente existencia disponible de Leche entera 1L.',
    )
  })

  test('only available units are allocated: reserved units of a lot are skipped', async () => {
    const fx = await setupOrders()
    const first = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 5,
      expiresOn: '2098-12-01',
    })
    const second = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 5,
      expiresOn: '2099-01-01',
    })
    await place(fx, [line(fx.pieceId, 5)])
    const order = await place(fx, [line(fx.pieceId, 3)])
    expect(order.lines[0].allocations).toEqual([
      expect.objectContaining({ lotId: second.id, quantity: 3 }),
    ])
    expect(first.id).not.toBe(second.id)
  })

  test('several simultaneous orders never reserve more than on hand', async () => {
    const fx = await setupOrders()
    const lot = await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => place(fx, [line(fx.pieceId, 3)])),
    )
    const ok = results.filter((r) => r.status === 'fulfilled')
    expect(ok).toHaveLength(3)
    for (const r of results) {
      if (r.status === 'rejected') {
        expect(r.reason.message).toBe(
          'No hay suficiente existencia disponible de Leche entera 1L.',
        )
      }
    }
    const [row] = (await orderState()).lots
    expect(row).toMatchObject({ id: lot.id, onHand: 10, reserved: 9 })
  })

  test('concurrent orders over two lots keep reserved within on hand per lot', async () => {
    const fx = await setupOrders()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 7,
      expiresOn: '2098-12-01',
    })
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 5,
      expiresOn: '2099-01-01',
    })
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => place(fx, [line(fx.pieceId, 2)])),
    )
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(6)
    const reserved = (await orderState()).lots.reduce(
      (s, l) => s + l.reserved,
      0,
    )
    expect(reserved).toBe(12)
  })

  test('rejects invalid input and leaves everything unchanged', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 50 })
    const qty =
      'La cantidad de cada producto debe ser un entero mayor que cero.'
    await rejects(
      fx,
      () => place(fx, []),
      'invalid',
      'Agrega al menos un producto al pedido.',
    )
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      await rejects(
        fx,
        () => place(fx, [line(fx.pieceId, bad)]),
        'invalid',
        qty,
      )
    }
    await rejects(
      fx,
      () => place(fx, [line(fx.pieceId, 1), line(fx.pieceId, 2)]),
      'invalid',
      'No repitas la misma presentación en el pedido.',
    )
    await rejects(
      fx,
      () => place(fx, [line(fx.boxId, 2147483647)]),
      'invalid',
      'La cantidad del pedido es demasiado grande.',
    )
    await rejects(
      fx,
      () => place(fx, [line(crypto.randomUUID(), 1)]),
      'not_found',
      'No encontramos esa presentación.',
    )
    await rejects(
      fx,
      () =>
        createOrder(fx.staffA, {
          warehouseId: fx.a.id,
          customerId: crypto.randomUUID(),
          lines: [line(fx.pieceId, 1)],
        }),
      'not_found',
      'No encontramos ese cliente.',
    )
    await rejects(
      fx,
      () =>
        createOrder(fx.owner, {
          warehouseId: crypto.randomUUID(),
          customerId: fx.customer.id,
          lines: [line(fx.pieceId, 1)],
        }),
      'not_found',
      'No encontramos ese almacén.',
    )
  })

  test('rejects an inactive customer', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 50 })
    await updateCustomer(fx.owner, fx.customer.id, { active: false })
    await rejects(
      fx,
      () => place(fx, [line(fx.pieceId, 1)]),
      'conflict',
      'Este cliente está inactivo.',
    )
  })

  test('rejects an order total above the integer limit', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 2_000_000_000 })
    await rejects(
      fx,
      () => place(fx, [line(fx.pieceId, 3_000_000)]),
      'invalid',
      'El total del pedido es demasiado grande.',
    )
  })

  test('the staff of A orders in A but not in B; unassigned staff cannot order', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 50 })
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 50,
      warehouseId: fx.b.id,
    })
    await place(fx, [line(fx.pieceId, 1)], fx.staffA)
    await rejects(
      fx,
      () =>
        createOrder(fx.staffA, {
          warehouseId: fx.b.id,
          customerId: fx.customer.id,
          lines: [line(fx.pieceId, 1)],
        }),
      'forbidden',
      'No tienes permiso para esta acción.',
    )
    await rejects(
      fx,
      () => place(fx, [line(fx.pieceId, 1)], fx.managerB),
      'forbidden',
      'No tienes permiso para esta acción.',
    )
  })

  test('withdrawals cannot take units reserved by an order', async () => {
    const fx = await setupOrders()
    const lot = await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
    await place(fx, [line(fx.pieceId, 8)])
    const error = await errorOf(() =>
      adjustLot(fx.owner, { lotId: lot.id, quantity: -3, reason: 'x' }),
    )
    expect(error.message).toBe(
      'Ese lote tiene unidades apartadas para pedidos.',
    )
  })
})
