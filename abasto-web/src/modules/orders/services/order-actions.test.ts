import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { createCustomer } from '#/modules/customers/services/customers'
import { stockMovements } from '#/modules/inventory/db/schema'
import { ledgerSum } from '#/modules/inventory/services/testing'
import {
  cancelOrder,
  pickupOrder,
  prepareOrder,
} from '#/modules/orders/services/order-actions'
import { getOrder, listOrders } from '#/modules/orders/services/order-reads'
import { createOrder } from '#/modules/orders/services/orders'
import {
  advance,
  errorOf,
  orderState,
  receive,
  setupOrders,
  useClock,
} from '#/modules/orders/services/testing'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

async function setup(quantity = 20) {
  const fx = await setupOrders()
  const lot = await receive(fx, { productId: fx.milkBox.id, quantity })
  const place = (n: number, actor = fx.clerkA) =>
    createOrder(actor, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: n }],
    })
  return { fx, lot, place }
}

const statusOf = async (
  fx: { clerkA: Parameters<typeof getOrder>[0] },
  id: string,
) => (await getOrder(fx.clerkA, id)).status

const onlyReserved = 'Solo se puede preparar un pedido reservado.'
const onlyOpenPickup = 'Solo se puede entregar un pedido reservado o preparado.'
const onlyOpenCancel = 'Solo se puede cancelar un pedido reservado o preparado.'
const expired =
  'El pedido venció y se liberó el producto. Crea un pedido nuevo.'

describe('prepareOrder', () => {
  test('Reservado → Preparado keeps the reservation', async () => {
    const { fx, place } = await setup()
    const order = await place(5)
    const prepared = await prepareOrder(fx.clerkA, order.id)
    expect(prepared.status).toBe('Preparado')
    expect(prepared.preparedAt).toBeInstanceOf(Date)
    expect((await orderState()).lots[0]).toMatchObject({
      onHand: 20,
      reserved: 5,
    })
  })

  test('only a reserved order can be prepared', async () => {
    const { fx, place } = await setup()
    const order = await place(5)
    await prepareOrder(fx.clerkA, order.id)
    const before = await orderState()
    const again = await errorOf(() => prepareOrder(fx.clerkA, order.id))
    expect([again.code, again.message]).toEqual(['conflict', onlyReserved])
    await pickupOrder(fx.clerkA, order.id)
    const done = await errorOf(() => prepareOrder(fx.clerkA, order.id))
    expect(done.message).toBe(onlyReserved)
    expect(await orderState()).not.toEqual(before)
  })
})

describe('pickupOrder', () => {
  test('appends sale movements per allocation and lowers on hand and reserved together', async () => {
    const { fx, place } = await setup(6)
    const second = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 4,
      expiresOn: '2099-01-01',
    })
    const order = await place(9)
    expect(order.lines[0].allocations).toHaveLength(2)
    await prepareOrder(fx.clerkA, order.id)
    const picked = await pickupOrder(fx.clerkA, order.id)
    expect(picked.status).toBe('Recogido')
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.type, 'sale'))
    expect(movements).toHaveLength(2)
    expect(movements.every((m) => m.reference === order.id)).toBe(true)
    expect(movements.every((m) => m.actorId === fx.clerkA.userId)).toBe(true)
    expect(movements.reduce((s, m) => s + m.quantity, 0)).toBe(-9)
    const lots = (await orderState()).lots
    expect(lots.every((l) => l.reserved === 0)).toBe(true)
    expect(lots.reduce((s, l) => s + l.onHand, 0)).toBe(1)
    for (const l of lots) expect(await ledgerSum(l.id)).toBe(l.onHand)
    expect(second.id).toBeDefined()
  })

  test('works straight from Reservado', async () => {
    const { fx, place } = await setup()
    const order = await place(2)
    expect((await pickupOrder(fx.clerkA, order.id)).status).toBe('Recogido')
  })

  test('a picked-up, cancelled or expired order cannot be picked up again', async () => {
    const { fx, place } = await setup()
    const picked = await place(2)
    await pickupOrder(fx.clerkA, picked.id)
    const cancelled = await place(2)
    await cancelOrder(fx.clerkA, cancelled.id)
    for (const id of [picked.id, cancelled.id]) {
      const before = await orderState()
      const error = await errorOf(() => pickupOrder(fx.clerkA, id))
      expect([error.code, error.message]).toEqual(['conflict', onlyOpenPickup])
      expect(await orderState()).toEqual(before)
    }
  })

  test('has a payment seam that does not block yet', async () => {
    const { fx, place } = await setup()
    const order = await place(1)
    expect((await pickupOrder(fx.clerkA, order.id)).status).toBe('Recogido')
  })
})

describe('cancelOrder', () => {
  test('releases the reserved units', async () => {
    const { fx, place } = await setup()
    const order = await place(7)
    await prepareOrder(fx.clerkA, order.id)
    const cancelled = await cancelOrder(fx.clerkA, order.id)
    expect(cancelled.status).toBe('Cancelado')
    expect((await orderState()).lots[0]).toMatchObject({
      onHand: 20,
      reserved: 0,
    })
    expect((await orderState()).movements).toBe(1) // only the purchase
    const again = await place(20)
    expect(again.status).toBe('Reservado')
  })

  test('cannot cancel a picked-up or already cancelled order', async () => {
    const { fx, place } = await setup()
    const picked = await place(2)
    await pickupOrder(fx.clerkA, picked.id)
    const cancelled = await place(2)
    await cancelOrder(fx.clerkA, cancelled.id)
    for (const id of [picked.id, cancelled.id]) {
      const before = await orderState()
      const error = await errorOf(() => cancelOrder(fx.clerkA, id))
      expect([error.code, error.message]).toEqual(['conflict', onlyOpenCancel])
      expect(await orderState()).toEqual(before)
    }
  })
})

describe('permissions and unknown orders', () => {
  test('the clerk of A acts on A orders; staff of B and others are forbidden', async () => {
    const { fx, place } = await setup()
    const order = await place(3)
    for (const act of [prepareOrder, pickupOrder, cancelOrder, getOrder]) {
      const error = await errorOf(() => act(fx.managerB, order.id))
      expect([error.code, error.message]).toEqual([
        'forbidden',
        'No tienes permiso para esta acción.',
      ])
    }
    expect(await statusOf(fx, order.id)).toBe('Reservado')
    expect((await prepareOrder(fx.managerA, order.id)).status).toBe('Preparado')
    expect((await cancelOrder(fx.owner, order.id)).status).toBe('Cancelado')
  })

  test('unknown order', async () => {
    const { fx } = await setup()
    for (const act of [prepareOrder, pickupOrder, cancelOrder, getOrder]) {
      const error = await errorOf(() => act(fx.owner, crypto.randomUUID()))
      expect([error.code, error.message]).toEqual([
        'not_found',
        'No encontramos ese pedido.',
      ])
    }
  })
})

describe('lazy expiry', () => {
  test('an overdue order cannot be acted on; its stock is released and the order is Vencido', async () => {
    const { fx, place } = await setup()
    const order = await place(10)
    advance(25)
    for (const act of [prepareOrder, pickupOrder, cancelOrder]) {
      const error = await errorOf(() => act(fx.clerkA, order.id))
      expect([error.code, error.message]).toEqual(['conflict', expired])
    }
    expect(await statusOf(fx, order.id)).toBe('Vencido')
    expect((await orderState()).lots[0]).toMatchObject({
      onHand: 20,
      reserved: 0,
    })
  })

  test('creating an order expires overdue ones first so their stock is available', async () => {
    const { fx, place } = await setup(10)
    const old = await place(10)
    advance(25)
    const fresh = await place(10)
    expect(fresh.status).toBe('Reservado')
    expect(await statusOf(fx, old.id)).toBe('Vencido')
    expect((await orderState()).lots[0]).toMatchObject({
      onHand: 10,
      reserved: 10,
    })
  })

  test('a prepared order also expires', async () => {
    const { fx, place } = await setup()
    const order = await place(4)
    await prepareOrder(fx.clerkA, order.id)
    advance(25)
    const list = await listOrders(fx.clerkA, { warehouseId: fx.a.id })
    expect(list[0]).toMatchObject({ id: order.id, status: 'Vencido' })
    expect((await orderState()).lots[0].reserved).toBe(0)
  })

  test('picked-up and cancelled orders never expire', async () => {
    const { fx, place } = await setup()
    const picked = await place(2)
    await pickupOrder(fx.clerkA, picked.id)
    const cancelled = await place(2)
    await cancelOrder(fx.clerkA, cancelled.id)
    advance(100)
    const list = await listOrders(fx.clerkA, { warehouseId: fx.a.id })
    expect(list.map((o) => o.status).sort()).toEqual(['Cancelado', 'Recogido'])
  })

  test('expiry in warehouse A is not triggered by a call in warehouse B', async () => {
    const { fx, place } = await setup()
    const order = await place(4)
    advance(25)
    await listOrders(fx.managerB, { warehouseId: fx.b.id })
    expect((await orderState()).lots[0].reserved).toBe(4)
    expect((await orderState()).orders[0].status).toBe('Reservado')
    expect(order.id).toBeDefined()
  })
})

describe('listOrders and getOrder', () => {
  test('lists a warehouse newest first and filters by status and customer', async () => {
    const { fx, place } = await setup()
    const other = await createCustomer(fx.owner, { name: 'Abarrotes Sur' })
    const first = await place(1)
    const second = await createOrder(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId: other.id,
      lines: [{ presentationId: fx.pieceId, quantity: 2 }],
    })
    await prepareOrder(fx.clerkA, first.id)
    const all = await listOrders(fx.clerkA, { warehouseId: fx.a.id })
    expect(all.map((o) => o.id)).toEqual([second.id, first.id])
    expect(all[0]).toMatchObject({
      customerName: 'Abarrotes Sur',
      totalCents: 2000,
    })
    const prepared = await listOrders(fx.clerkA, {
      warehouseId: fx.a.id,
      status: 'Preparado',
    })
    expect(prepared.map((o) => o.id)).toEqual([first.id])
    const byCustomer = await listOrders(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId: other.id,
    })
    expect(byCustomer.map((o) => o.id)).toEqual([second.id])
    expect(await listOrders(fx.owner, { warehouseId: fx.b.id })).toEqual([])
  })

  test('listing requires access to that warehouse', async () => {
    const { fx } = await setup()
    const error = await errorOf(() =>
      listOrders(fx.clerkA, { warehouseId: fx.b.id }),
    )
    expect(error.code).toBe('forbidden')
  })

  test('getOrder returns lines with product names and allocations with lot codes', async () => {
    const { fx, place } = await setup()
    const order = await place(3)
    const read = await getOrder(fx.clerkA, order.id)
    expect(read).toMatchObject({ customerName: 'Distribuidora Norte' })
    expect(read.lines[0]).toMatchObject({
      productName: 'Leche entera 1L',
      presentationName: 'Pieza',
      quantity: 3,
    })
    expect(read.lines[0].allocations[0]).toMatchObject({ quantity: 3 })
  })
})

describe('pickup of a lot that expired meanwhile', () => {
  const caducado =
    'Un lote de este pedido ya caducó. Cancélalo y crea un pedido nuevo.'

  async function reserveOnExpiringLot() {
    const fx = await setupOrders()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      expiresOn: '2098-12-01',
    })
    useClock(() => new Date('2098-12-01T18:00:00Z'))
    const order = await createOrder(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 4 }],
    })
    return { fx, order }
  }

  test('is rejected once the lot is past its expiry day, leaving everything unchanged', async () => {
    const { fx, order } = await reserveOnExpiringLot()
    // 2098-12-02 06:00 in Mexico City: the order (24 h) is still open.
    useClock(() => new Date('2098-12-02T12:00:00Z'))
    const before = await orderState()
    for (const status of ['Reservado', 'Preparado'] as const) {
      if (status === 'Preparado') await prepareOrder(fx.clerkA, order.id)
      const error = await errorOf(() => pickupOrder(fx.clerkA, order.id))
      expect(error.code).toBe('conflict')
      expect(error.message).toBe(caducado)
    }
    expect((await orderState()).movements).toBe(before.movements)
    expect((await orderState()).lots).toEqual(before.lots)
    expect(await statusOf(fx, order.id)).toBe('Preparado')
    // Cancelling is the way out and releases the units.
    await cancelOrder(fx.clerkA, order.id)
    expect((await orderState()).lots[0].reserved).toBe(0)
  })

  test('a lot expiring today can still be picked up', async () => {
    const { fx, order } = await reserveOnExpiringLot()
    useClock(() => new Date('2098-12-02T04:00:00Z')) // 22:00 on 12-01 in Mexico City
    const picked = await pickupOrder(fx.clerkA, order.id)
    expect(picked.status).toBe('Recogido')
  })
})
