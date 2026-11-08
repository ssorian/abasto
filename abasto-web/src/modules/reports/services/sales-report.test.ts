import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { updateProduct } from '#/modules/catalog/services/products'
import { createSupplier } from '#/modules/catalog/services/suppliers'
import { createCustomer } from '#/modules/customers/services/customers'
import { saveCommercialRules } from '#/modules/customers/services/commercial-rules'
import { getWarehouseStock } from '#/modules/inventory/services/stock-reads'
import { orders } from '#/modules/orders/db/schema'
import { cancelOrder } from '#/modules/orders/services/order-actions'
import { createOrder } from '#/modules/orders/services/orders'
import { getSalesReport } from '#/modules/reports/services/sales-report'
import {
  errorOf,
  farFuture,
  receive,
  setupReports,
  useClock,
} from '#/modules/reports/services/testing'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const wide = {
  period: {
    preset: 'custom' as const,
    from: '2026-11-01',
    to: '2026-11-30',
  },
}
const forbidden = 'No tienes permiso para esta acción.'

describe('sales and margin', () => {
  test('margin from two lots, a rule discount, and no cancelled, expired or open orders', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      totalCostCents: 1005,
      expiresOn: '2099-01-01',
    })
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      totalCostCents: 2000,
      expiresOn: '2099-06-01',
    })
    const sur = await createCustomer(fx.owner, { name: 'Distribuidora Sur' })
    await saveCommercialRules(fx.owner, sur.id, [
      { presentationId: fx.pieceId, minQuantity: 1, discountBps: 1000 },
    ])

    // 15 pieces: 10 from the first lot (1005) + 5 from the second (1000).
    await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 15 })
    // 5 pieces at 900 (rule), all from the second lot (1000).
    await fx.sell({
      at: '2026-11-03T18:00:00Z',
      quantity: 5,
      customerId: sur.id,
    })

    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 20,
      totalCostCents: 600,
      expiresOn: '2099-12-01',
    })
    const place = (quantity: number) =>
      createOrder(fx.staffA, {
        warehouseId: fx.a.id,
        customerId: fx.customer.id,
        lines: [{ presentationId: fx.pieceId, quantity }],
      })
    useClock(() => new Date('2026-11-03T19:00:00Z'))
    await cancelOrder(fx.staffA, (await place(2)).id)
    await place(2) // becomes Vencido after the reservation window
    useClock(() => new Date('2026-11-05T12:00:00Z'))
    await getWarehouseStock(fx.owner, fx.a.id)
    await place(1) // still Reservado

    const statuses = (await db.select({ status: orders.status }).from(orders))
      .map((row) => row.status)
      .sort()
    expect(statuses).toEqual([
      'Cancelado',
      'Recogido',
      'Recogido',
      'Reservado',
      'Vencido',
    ])

    const report = await getSalesReport(fx.owner, wide)
    expect(report.range).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(report.summary).toEqual({
      orders: 2,
      units: 20,
      revenueCents: 19500,
      costCents: 3005,
      marginCents: 16495,
    })
    expect(report.byDay).toEqual([
      {
        key: '2026-11-02',
        name: '2026-11-02',
        orders: 1,
        units: 15,
        revenueCents: 15000,
        costCents: 2005,
        marginCents: 12995,
      },
      {
        key: '2026-11-03',
        name: '2026-11-03',
        orders: 1,
        units: 5,
        revenueCents: 4500,
        costCents: 1000,
        marginCents: 3500,
      },
    ])
    expect(report.byProduct).toEqual([
      {
        key: fx.milkBox.id,
        name: fx.milkBox.name,
        sku: fx.milkBox.sku,
        unit: 'piezas',
        orders: 2,
        units: 20,
        revenueCents: 19500,
        costCents: 3005,
        marginCents: 16495,
      },
    ])
    expect(
      report.byCustomer.map((row) => [row.name, row.revenueCents]),
    ).toEqual([
      ['Distribuidora Norte', 15000],
      ['Distribuidora Sur', 4500],
    ])
    expect(report.byCustomer[1]).toMatchObject({
      costCents: 1000,
      marginCents: 3500,
    })
    expect(report.byWarehouse).toEqual([
      {
        key: fx.a.id,
        name: 'Almacén A',
        orders: 2,
        units: 20,
        revenueCents: 19500,
        costCents: 3005,
        marginCents: 16495,
      },
    ])
  })

  test('cost keeps fractions inside a row and rounds once per row', async () => {
    const fx = await setupReports()
    // 3 units for 100 cents: 33.33… cents each.
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 3,
      totalCostCents: 100,
      expiresOn: farFuture,
    })
    await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 1 })
    await fx.sell({ at: '2026-11-03T18:00:00Z', quantity: 1 })

    const report = await getSalesReport(fx.owner, wide)
    // 66.67 → 67 as a whole, but each single day rounds to 33.
    expect(report.summary.costCents).toBe(67)
    expect(report.byProduct[0]?.costCents).toBe(67)
    expect(report.byDay.map((row) => row.costCents)).toEqual([33, 33])
    expect(report.summary.marginCents).toBe(2000 - 67)
  })

  test('a pickup at 23:30 Mexico City belongs to that local day', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      expiresOn: farFuture,
    })
    // 05:30Z is 23:30 on Nov 2 in Mexico City; 06:30Z is 00:30 on Nov 3.
    await fx.sell({ at: '2026-11-03T05:30:00Z', quantity: 1 })
    await fx.sell({ at: '2026-11-03T06:30:00Z', quantity: 2 })

    const nov2 = await getSalesReport(fx.owner, {
      period: { preset: 'custom', from: '2026-11-02', to: '2026-11-02' },
    })
    expect(nov2.summary).toMatchObject({ orders: 1, revenueCents: 1000 })
    expect(nov2.byDay.map((row) => row.key)).toEqual(['2026-11-02'])

    const nov3 = await getSalesReport(fx.owner, {
      period: { preset: 'custom', from: '2026-11-03', to: '2026-11-03' },
    })
    expect(nov3.summary).toMatchObject({ orders: 1, revenueCents: 2000 })
    expect(nov3.byDay.map((row) => row.key)).toEqual(['2026-11-03'])
  })

  test('presets are relative to the business today', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      expiresOn: farFuture,
    })
    await fx.sell({ at: '2026-11-01T18:00:00Z', quantity: 1 })
    await fx.sell({ at: '2026-11-04T18:00:00Z', quantity: 1 })
    useClock(() => new Date('2026-11-04T20:00:00Z'))
    const today = await getSalesReport(fx.owner, {
      period: { preset: 'today' },
    })
    expect(today.range).toEqual({ from: '2026-11-04', to: '2026-11-04' })
    expect(today.summary.orders).toBe(1)
    const week = await getSalesReport(fx.owner, { period: { preset: '7' } })
    expect(week.summary.orders).toBe(2)
  })

  test('an empty period reports zeros', async () => {
    const fx = await setupReports()
    const report = await getSalesReport(fx.owner, wide)
    expect(report.summary).toEqual({
      orders: 0,
      units: 0,
      revenueCents: 0,
      costCents: 0,
      marginCents: 0,
    })
    expect(report.byDay).toEqual([])
  })
})

describe('sales report scope', () => {
  async function twoWarehouses() {
    const fx = await setupReports()
    for (const warehouseId of [fx.a.id, fx.b.id]) {
      await receive(fx, {
        productId: fx.milkBox.id,
        warehouseId,
        quantity: 10,
        expiresOn: farFuture,
      })
    }
    await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 1 })
    await fx.sell({
      at: '2026-11-02T18:00:00Z',
      quantity: 3,
      warehouseId: fx.b.id,
    })
    return fx
  }

  test('the owner sees every warehouse and can filter', async () => {
    const fx = await twoWarehouses()
    const all = await getSalesReport(fx.owner, wide)
    expect(all.summary.revenueCents).toBe(4000)
    expect(all.byWarehouse.map((row) => row.name)).toEqual([
      'Almacén A',
      'Almacén B',
    ])
    const onlyB = await getSalesReport(fx.owner, {
      ...wide,
      warehouseIds: [fx.b.id],
    })
    expect(onlyB.summary.revenueCents).toBe(3000)
    expect(onlyB.warehouses.map((item) => item.id)).toEqual([fx.b.id])
  })

  test('a manager reports only the warehouses they manage', async () => {
    const fx = await twoWarehouses()
    const own = await getSalesReport(fx.managerA, wide)
    expect(own.summary.revenueCents).toBe(1000)
    expect(own.warehouses.map((item) => item.id)).toEqual([fx.a.id])
    expect(
      await errorOf(() =>
        getSalesReport(fx.managerA, { ...wide, warehouseIds: [fx.b.id] }),
      ),
    ).toMatchObject({ code: 'forbidden', message: forbidden })
    expect(
      await errorOf(() =>
        getSalesReport(fx.managerA, {
          ...wide,
          warehouseIds: [fx.a.id, fx.b.id],
        }),
      ),
    ).toMatchObject({ code: 'forbidden' })
  })
})

describe('supplier filter', () => {
  test('every aggregate counts only lines of the supplier’s products', async () => {
    const fx = await setupReports()
    const lala = await createSupplier(fx.owner, { name: 'Lácteos Test' })
    const alpura = await createSupplier(fx.owner, { name: 'Bebidas Test' })
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      totalCostCents: 1000,
      expiresOn: farFuture,
    })
    await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 4 })
    await updateProduct(fx.owner, fx.milkBox.id, { supplierId: lala.id })

    const mine = await getSalesReport(fx.owner, {
      ...wide,
      supplierId: lala.id,
    })
    const all = await getSalesReport(fx.owner, wide)
    expect(mine.summary).toEqual(all.summary)
    expect(mine.summary.revenueCents).toBe(4000)
    expect(mine.byProduct.map((row) => row.key)).toEqual([fx.milkBox.id])
    expect(mine.byDay).toHaveLength(1)
    expect(mine.byCustomer).toHaveLength(1)
    expect(mine.byWarehouse).toHaveLength(1)

    const other = await getSalesReport(fx.owner, {
      ...wide,
      supplierId: alpura.id,
    })
    expect(other.summary.orders).toBe(0)
    expect(other.summary.revenueCents).toBe(0)
    expect(other.byProduct).toEqual([])
    expect(other.byDay).toEqual([])
  })

  test('an unknown or malformed supplier id yields empty results, not an error', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      totalCostCents: 1000,
      expiresOn: farFuture,
    })
    await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 4 })
    for (const supplierId of [crypto.randomUUID(), 'nope']) {
      const report = await getSalesReport(fx.owner, { ...wide, supplierId })
      expect(report.summary.orders).toBe(0)
      expect(report.byProduct).toEqual([])
      expect(report.byWarehouse).toEqual([])
    }
  })
})
