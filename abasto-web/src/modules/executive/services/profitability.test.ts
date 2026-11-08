import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { updateProduct } from '#/modules/catalog/services/products'
import { createOrder } from '#/modules/orders/services/orders'
import { pickupOrder } from '#/modules/orders/services/order-actions'
import { payCash } from '#/modules/orders/services/testing'
import { setPrices } from '#/modules/pricing/services/prices'
import {
  getMarginReport,
  getWarehouseRanking,
} from '#/modules/executive/services/profitability'
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

const range = (from: string, to: string) => ({
  period: { preset: 'custom' as const, from, to },
})
const wide = range('2026-11-01', '2026-11-30')
const forbidden = 'No tienes permiso para esta acción.'

describe('owner only', () => {
  test('a warehouse manager is refused by both reports', async () => {
    const fx = await setupReports()
    expect(
      (await errorOf(() => getMarginReport(fx.managerB, wide))).message,
    ).toBe(forbidden)
    expect(
      (await errorOf(() => getWarehouseRanking(fx.managerB, wide))).message,
    ).toBe(forbidden)
  })
})

describe('margin report', () => {
  test('exact cents by product, supplier and warehouse; null supplier is its own group', async () => {
    const fx = await setupReports()
    // Milk: 10 pieces for 1005 cents; water: 10 pieces for 500 cents (no supplier).
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      totalCostCents: 1005,
      expiresOn: farFuture,
    })
    await receive(fx, {
      productId: fx.water.id,
      quantity: 10,
      totalCostCents: 500,
      expiresOn: farFuture,
    })
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.piece(fx.water).id, priceCents: 400 }],
    })
    await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 4 }) // 4000 / 402
    useClock(() => new Date('2026-11-03T18:00:00Z'))
    const waterOrder = await createOrder(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.piece(fx.water).id, quantity: 5 }],
    })
    await pickupOrder(fx.clerkA, waterOrder.id, payCash) // 2000 / 250

    const report = await getMarginReport(fx.owner, wide)
    expect(report.summary).toEqual({
      orders: 2,
      units: 9,
      revenueCents: 6000,
      costCents: 652,
      marginCents: 5348,
      marginBps: 8913,
    })
    expect(
      report.byProduct.map((r) => [
        r.name,
        r.revenueCents,
        r.costCents,
        r.marginCents,
        r.marginBps,
      ]),
    ).toEqual([
      [fx.milkBox.name, 4000, 402, 3598, 8995],
      [fx.water.name, 2000, 250, 1750, 8750],
    ])
    expect(
      report.bySupplier.map((r) => [
        r.key,
        r.name,
        r.revenueCents,
        r.marginCents,
      ]),
    ).toEqual([
      [fx.supplier.id, fx.supplier.name, 4000, 3598],
      ['none', 'Sin proveedor', 2000, 1750],
    ])
    expect(
      report.byWarehouse.map((r) => [r.key, r.revenueCents, r.marginCents]),
    ).toEqual([
      [fx.a.id, 6000, 5348],
      [fx.b.id, 0, 0],
    ])
    expect(report.byWarehouse[1]?.marginBps).toBeNull()
  })

  test('revenue and cost match the sales report', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 3,
      totalCostCents: 100,
      expiresOn: farFuture,
    })
    await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 1 })
    await fx.sell({ at: '2026-11-03T18:00:00Z', quantity: 1 })
    const sales = await getSalesReport(fx.owner, wide)
    const report = await getMarginReport(fx.owner, wide)
    expect(report.summary).toMatchObject({
      revenueCents: sales.summary.revenueCents,
      costCents: sales.summary.costCents,
      marginCents: sales.summary.marginCents,
    })
    expect(report.byProduct[0]?.costCents).toBe(sales.byProduct[0]?.costCents)
  })

  test('supplier changes are reflected: a reassigned product moves group', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      totalCostCents: 1000,
      expiresOn: farFuture,
    })
    await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 2 })
    await updateProduct(fx.owner, fx.milkBox.id, { supplierId: null })
    const report = await getMarginReport(fx.owner, wide)
    expect(report.bySupplier.map((r) => r.name)).toEqual(['Sin proveedor'])
  })

  test('negative margin and no sales at all', async () => {
    const fx = await setupReports()
    expect((await getMarginReport(fx.owner, wide)).summary).toEqual({
      orders: 0,
      units: 0,
      revenueCents: 0,
      costCents: 0,
      marginCents: 0,
      marginBps: null,
    })
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 1,
      totalCostCents: 1500,
      expiresOn: farFuture,
    })
    await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 1 })
    const { summary } = await getMarginReport(fx.owner, wide)
    expect(summary.marginCents).toBe(-500)
    expect(summary.marginBps).toBe(-5000)
  })
})

describe('warehouse ranking', () => {
  test('current vs previous period of equal length, boundaries and idle warehouses', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 50,
      totalCostCents: 5000, // 100 cents each
      expiresOn: farFuture,
    })
    await receive(fx, {
      productId: fx.milkBox.id,
      warehouseId: fx.b.id,
      quantity: 50,
      totalCostCents: 5000,
      expiresOn: farFuture,
    })
    // Current period Nov 8–14 (7 days); previous Nov 1–7.
    await fx.sell({ at: '2026-11-08T18:00:00Z', quantity: 2 }) // first day current
    await fx.sell({ at: '2026-11-14T18:00:00Z', quantity: 4 }) // last day current
    await fx.sell({ at: '2026-11-07T18:00:00Z', quantity: 3 }) // last day previous
    await fx.sell({ at: '2026-11-01T18:00:00Z', quantity: 1 }) // first day previous
    await fx.sell({ at: '2026-10-31T18:00:00Z', quantity: 9 }) // before both: ignored
    await fx.sell({ at: '2026-11-15T18:00:00Z', quantity: 9 }) // after: ignored

    const ranking = await getWarehouseRanking(
      fx.owner,
      range('2026-11-08', '2026-11-14'),
    )
    expect(ranking.range).toEqual({ from: '2026-11-08', to: '2026-11-14' })
    expect(ranking.previousRange).toEqual({
      from: '2026-11-01',
      to: '2026-11-07',
    })
    expect(ranking.rows.map((r) => r.key)).toEqual([fx.a.id, fx.b.id])
    const [a, b] = ranking.rows
    expect(a.current).toEqual({
      revenueCents: 6000,
      costCents: 600,
      marginCents: 5400,
      marginBps: 9000,
      tickets: 2,
      averageTicketCents: 3000,
    })
    expect(a.previous).toMatchObject({
      revenueCents: 4000,
      marginCents: 3600,
      tickets: 2,
      averageTicketCents: 2000,
    })
    expect(a.delta).toEqual({
      revenueCents: 2000,
      marginCents: 1800,
      marginBps: 0,
      tickets: 0,
      averageTicketCents: 1000,
      revenueChangeBps: 5000,
    })
    // Warehouse B sold nothing in either period.
    expect(b.current).toEqual({
      revenueCents: 0,
      costCents: 0,
      marginCents: 0,
      marginBps: null,
      tickets: 0,
      averageTicketCents: 0,
    })
    expect(b.delta.revenueChangeBps).toBeNull()
    expect(b.delta.marginBps).toBeNull()
  })

  test('a warehouse that only sold before the period shows a negative delta', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      warehouseId: fx.b.id,
      quantity: 10,
      totalCostCents: 1000,
      expiresOn: farFuture,
    })
    await fx.sell({
      at: '2026-11-03T18:00:00Z',
      quantity: 2,
      warehouseId: fx.b.id,
    })
    const ranking = await getWarehouseRanking(
      fx.owner,
      range('2026-11-08', '2026-11-14'),
    )
    const b = ranking.rows.find((r) => r.key === fx.b.id)
    expect(b?.previous.revenueCents).toBe(2000)
    expect(b?.delta).toMatchObject({
      revenueCents: -2000,
      revenueChangeBps: -10000,
      tickets: -1,
    })
  })
})
