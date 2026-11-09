import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { setMinimumStock } from '#/modules/inventory/services/stock-minimums'
import { createSupplierOrder } from '#/modules/inventory/services/supplier-orders'
import {
  errorOf,
  lineFor,
  setupSupplierOrders,
} from '#/modules/inventory/services/supplier-testing'
import {
  farFuture,
  receive,
  setupReports,
  useClock,
} from '#/modules/reports/services/testing'
import { getManagerDashboard } from '#/modules/reports/services/manager-dashboard'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const week = { period: { preset: '7' as const } }
const forbidden = 'No tienes permiso para esta acción.'

async function orderFor(
  fx: Awaited<ReturnType<typeof setupSupplierOrders>>,
  warehouseId: string,
  reference: string,
) {
  const actor = warehouseId === fx.a.id ? fx.managerA : fx.managerB
  return createSupplierOrder(actor, {
    supplierId: fx.supplier.id,
    warehouseId,
    expectedOn: '2099-01-10',
    reference,
    lines: [lineFor(fx.milk, 2)],
  })
}

describe('getManagerDashboard', () => {
  test('covers one warehouse: defaults to the first of the manager and lists only its pending orders', async () => {
    const fx = await setupSupplierOrders()
    await orderFor(fx, fx.a.id, 'PED-A')
    await orderFor(fx, fx.b.id, 'PED-B')

    const dashboard = await getManagerDashboard(fx.managerA, week)
    expect(dashboard.warehouse.id).toBe(fx.a.id)
    expect(dashboard.pendingOrders.map((order) => order.reference)).toEqual([
      'PED-A',
    ])
    expect(dashboard.sales.warehouses.map((item) => item.id)).toEqual([fx.a.id])
    expect(dashboard.cash.warehouses.map((item) => item.id)).toEqual([fx.a.id])
    expect(dashboard.stock.warehouses.map((item) => item.id)).toEqual([fx.a.id])
    expect(dashboard.sales.summary.orders).toBe(0)
    expect(dashboard.previousSales.summary.revenueCents).toBe(0)
  })

  test('a manager of B is refused for warehouse A', async () => {
    const fx = await setupSupplierOrders()
    await orderFor(fx, fx.a.id, 'PED-A')
    await orderFor(fx, fx.b.id, 'PED-B')
    const error = await errorOf(() =>
      getManagerDashboard(fx.managerB, { ...week, warehouseId: fx.a.id }),
    )
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe(forbidden)

    const own = await getManagerDashboard(fx.managerB, week)
    expect(own.warehouse.id).toBe(fx.b.id)
    expect(own.pendingOrders.map((order) => order.reference)).toEqual(['PED-B'])
  })

  test('only a manager reads it', async () => {
    const fx = await setupSupplierOrders()
    const staff = { ...fx.managerA, assignments: new Map() }
    const error = await errorOf(() => getManagerDashboard(staff, week))
    expect(error.code).toBe('forbidden')
  })

  test('a customer is refused', async () => {
    await setupSupplierOrders()
    const customer = {
      userId: 'customer-user',
      role: 'customer' as const,
      assignments: new Map(),
    }
    const error = await errorOf(() => getManagerDashboard(customer, week))
    expect(error).toMatchObject({ code: 'forbidden', message: forbidden })
  })
})

describe('getManagerDashboard sales', () => {
  test('sums the period and the days right before it, for that warehouse only', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 40,
      expiresOn: farFuture,
    })
    await fx.sell({ at: '2026-11-08T18:00:00Z', quantity: 3 })
    await fx.sell({ at: '2026-10-30T18:00:00Z', quantity: 2 })
    useClock(() => new Date('2026-11-08T20:00:00Z'))

    const dashboard = await getManagerDashboard(fx.staffA, week)
    expect(dashboard.sales.summary.revenueCents).toBe(3000)
    expect(dashboard.sales.range).toEqual({
      from: '2026-11-02',
      to: '2026-11-08',
    })
    expect(dashboard.previousSales.summary.revenueCents).toBe(2000)
    expect(
      dashboard.cash.rows.every((row) => row.warehouseId === fx.a.id),
    ).toBe(true)
  })
})

describe('getManagerDashboard supplier filter', () => {
  test('narrows pending orders and stock alerts to the supplier', async () => {
    const fx = await setupSupplierOrders()
    await orderFor(fx, fx.a.id, 'PED-ALPURA')
    await createSupplierOrder(fx.managerA, {
      supplierId: fx.cocaCola.id,
      warehouseId: fx.a.id,
      expectedOn: '2099-01-10',
      reference: 'PED-COLA',
      lines: [lineFor(fx.cola, 1)],
    })
    for (const product of [fx.milk, fx.cola]) {
      await setMinimumStock(fx.owner, {
        productId: product.id,
        warehouseId: fx.a.id,
        minimum: 5,
      })
    }

    const all = await getManagerDashboard(fx.managerA, week)
    expect(all.pendingOrders.map((order) => order.reference).sort()).toEqual([
      'PED-ALPURA',
      'PED-COLA',
    ])
    const lowStock = (d: typeof all) => d.stock.lowStock.map((row) => row.name)
    expect(lowStock(all)).toEqual(
      expect.arrayContaining(['Leche Alpura 1L', 'Cola 600ml']),
    )

    const cola = await getManagerDashboard(fx.managerA, {
      ...week,
      supplierId: fx.cocaCola.id,
    })
    expect(cola.pendingOrders.map((order) => order.reference)).toEqual([
      'PED-COLA',
    ])
    expect(lowStock(cola)).toEqual(['Cola 600ml'])

    const unknown = await getManagerDashboard(fx.managerA, {
      ...week,
      supplierId: 'nope',
    })
    expect(unknown.pendingOrders).toEqual([])
    expect(unknown.stock.lowStock).toEqual([])
  })

  test('narrows current and previous sales; cash cuts stay unchanged', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 40,
      expiresOn: farFuture,
    })
    await fx.sell({ at: '2026-11-08T18:00:00Z', quantity: 3 })
    await fx.sell({ at: '2026-10-30T18:00:00Z', quantity: 2 })
    useClock(() => new Date('2026-11-08T20:00:00Z'))

    const mine = await getManagerDashboard(fx.staffA, {
      ...week,
      supplierId: fx.supplier.id,
    })
    expect(mine.sales.summary.revenueCents).toBe(3000)
    expect(mine.previousSales.summary.revenueCents).toBe(2000)

    const other = await getManagerDashboard(fx.staffA, {
      ...week,
      supplierId: crypto.randomUUID(),
    })
    expect(other.sales.summary.revenueCents).toBe(0)
    expect(other.previousSales.summary.revenueCents).toBe(0)
    const unfiltered = await getManagerDashboard(fx.staffA, week)
    expect(other.cash).toEqual(unfiltered.cash)
  })

  test('a supplier filter never opens another warehouse', async () => {
    const fx = await setupSupplierOrders()
    const error = await errorOf(() =>
      getManagerDashboard(fx.managerB, {
        ...week,
        warehouseId: fx.a.id,
        supplierId: fx.supplier.id,
      }),
    )
    expect(error).toMatchObject({ code: 'forbidden', message: forbidden })
  })
})
