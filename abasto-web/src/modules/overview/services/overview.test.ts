import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { setMinimumStock } from '#/modules/inventory/services/stock-minimums'
import { createOrder } from '#/modules/orders/services/orders'
import { setReservationHours } from '#/modules/orders/services/reservation-settings'
import { getOverview } from '#/modules/overview/services/overview'
import {
  farFuture,
  receive,
  setupReports,
  useClock,
} from '#/modules/reports/services/testing'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

/** Today is 2026-11-04 (Mexico City); the clock reads 12:00 there. */
async function scenario() {
  const fx = await setupReports()
  await receive(fx, {
    productId: fx.milkBox.id,
    quantity: 100,
    totalCostCents: 10_000,
    expiresOn: farFuture,
  })
  await setMinimumStock(fx.owner, {
    productId: fx.milkBox.id,
    warehouseId: fx.a.id,
    minimum: 1000,
  })
  await receive(fx, {
    productId: fx.soda.id,
    quantity: 6,
    expiresOn: '2026-11-07',
  })
  await fx.sell({ at: '2026-11-03T16:00:00Z', quantity: 2 })
  await fx.sell({ at: '2026-11-04T16:00:00Z', quantity: 4 })
  useClock(() => new Date('2026-11-04T18:00:00Z'))

  const place = () =>
    createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 1 }],
    })
  await setReservationHours(fx.owner, 1)
  await place() // expires 13:00 today
  await setReservationHours(fx.owner, 24)
  await place() // expires tomorrow
  return fx
}

describe('Inicio per role', () => {
  test('the owner sees every warehouse with money', async () => {
    const fx = await scenario()
    const overview = await getOverview(fx.owner)
    expect(overview.canAdjustStock).toBe(true)
    expect(overview.today).toBe('2026-11-04')
    expect(overview.warehouses.map((item) => item.name)).toEqual([
      'Almacén A',
      'Almacén B',
    ])
    const [a, b] = overview.warehouses
    expect(a).toMatchObject({
      id: fx.a.id,
      openOrders: 2,
      expiringTodayOrders: 1,
      drawerOpen: true,
      belowMinimum: 1,
      expiringLots: 1,
      pickedUpToday: 1,
      salesCents: 4000,
      marginCents: 3600,
    })
    expect(b).toMatchObject({
      openOrders: 0,
      expiringTodayOrders: 0,
      drawerOpen: true,
      belowMinimum: 0,
      expiringLots: 0,
      pickedUpToday: 0,
      salesCents: 0,
      marginCents: 0,
    })
    expect(overview.totals).toMatchObject({
      openOrders: 2,
      expiringTodayOrders: 1,
      pickedUpToday: 1,
      salesCents: 4000,
      marginCents: 3600,
      drawersOpen: 2,
    })
    expect(overview.lowStock.map((row) => row.name)).toEqual([
      'Leche entera 1L',
    ])
    expect(overview.expiring.map((row) => row.name)).toEqual(['Refresco 600ml'])
    expect(overview.expiring[0]).toMatchObject({
      warehouseId: fx.a.id,
      productId: fx.soda.id,
      daysLeft: 3,
    })
    expect(overview.expired).toEqual([])
  })

  test('expired lots that still hold stock are listed', async () => {
    const fx = await scenario()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 5,
      expiresOn: '2026-11-01',
    })
    const overview = await getOverview(fx.owner)
    expect(overview.expired).toHaveLength(1)
    expect(overview.expired[0]).toMatchObject({
      warehouseId: fx.a.id,
      productId: fx.milkBox.id,
      name: 'Leche entera 1L',
      expiresOn: '2026-11-01',
      daysLeft: -3,
    })
    expect(overview.expired[0].lotId).toBeString()
    expect(overview.expiring.map((row) => row.name)).toEqual(['Refresco 600ml'])
  })

  test('a manager sees only their warehouse, with money', async () => {
    const fx = await scenario()
    const overview = await getOverview(fx.managerA)
    // Only owners get «Quitar» on expired lots.
    expect(overview.canAdjustStock).toBe(false)
    expect(overview.warehouses.map((item) => item.id)).toEqual([fx.a.id])
    expect(overview.warehouses[0]).toMatchObject({
      salesCents: 4000,
      marginCents: 3600,
    })
    const other = await getOverview(fx.managerB)
    expect(other.warehouses.map((item) => item.id)).toEqual([fx.b.id])
    expect(other.totals.openOrders).toBe(0)
  })
})
