import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { createOrder } from '#/modules/orders/services/orders'
import {
  getReservationHours,
  setReservationHours,
} from '#/modules/orders/services/reservation-settings'
import {
  advance,
  errorOf,
  receive,
  setupOrders,
  useClock,
} from '#/modules/orders/services/testing'
import { listOrders } from '#/modules/orders/services/order-reads'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const invalid =
  'La duración de la reserva debe ser un número entero de horas entre 1 y 720.'

describe('reservation duration', () => {
  test('defaults to 24 hours and any staff can read it', async () => {
    const fx = await setupOrders()
    expect(await getReservationHours(fx.staffA)).toBe(24)
  })

  test('the owner changes it and new orders use it', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
    await setReservationHours(fx.owner, 2)
    expect(await getReservationHours(fx.staffA)).toBe(2)
    await setReservationHours(fx.owner, 3)
    const before = Date.now()
    const order = await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 1 }],
    })
    const hours = (order.expiresAt.getTime() - before) / 3_600_000
    expect(hours).toBeGreaterThan(2.99)
    expect(hours).toBeLessThan(3.01)
    // 4 h later it is overdue under the 3 h setting.
    advance(4)
    const list = await listOrders(fx.staffA, { warehouseId: fx.a.id })
    expect(list[0].status).toBe('Vencido')
  })

  test('staff, including a manager, cannot change it', async () => {
    const fx = await setupOrders()
    for (const actor of [fx.managerA, fx.staffA]) {
      const error = await errorOf(() => setReservationHours(actor, 5))
      expect([error.code, error.message]).toEqual([
        'forbidden',
        'No tienes permiso para esta acción.',
      ])
    }
    expect(await getReservationHours(fx.owner)).toBe(24)
  })

  test('accepts 1..720 whole hours only', async () => {
    const fx = await setupOrders()
    await setReservationHours(fx.owner, 1)
    await setReservationHours(fx.owner, 720)
    for (const bad of [0, 721, -3, 1.5, Number.NaN]) {
      const error = await errorOf(() => setReservationHours(fx.owner, bad))
      expect([error.code, error.message]).toEqual(['invalid', invalid])
    }
    expect(await getReservationHours(fx.owner)).toBe(720)
  })
})
