import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { getMarginReport } from '#/modules/executive/services/profitability'
import { getOwnerDashboard } from '#/modules/reports/services/owner-dashboard'
import { getSalesReport } from '#/modules/reports/services/sales-report'
import { getStockAlerts } from '#/modules/reports/services/stock-alerts'
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
  period: { preset: 'custom' as const, from: '2026-11-01', to: '2026-11-30' },
}

describe('owner dashboard in one read', () => {
  test('returns the filters and every report the page needs, same as the separate reads', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 20,
      totalCostCents: 2000,
      expiresOn: farFuture,
    })
    await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 3 })
    useClock(null)

    const result = await getOwnerDashboard(fx.owner, wide)
    expect(result.warehouses.map((item) => item.name)).toEqual([
      'Almacén A',
      'Almacén B',
    ])
    expect(result.suppliers.map((item) => item.name)).toEqual([
      'Alpura',
      'Coca-Cola',
    ])
    expect(result.error).toBeUndefined()
    const data = result.data!
    expect(data.sales).toEqual(await getSalesReport(fx.owner, wide))
    expect(data.margin).toEqual(await getMarginReport(fx.owner, wide))
    expect(data.stockAlerts).toEqual(await getStockAlerts(fx.owner, {}))
    // The previous period is the same number of days right before.
    expect(data.ranking.previousRange).toEqual({
      from: '2026-10-02',
      to: '2026-10-31',
    })
    expect(data.previousSales.range).toEqual(data.ranking.previousRange)
    expect(data.previousSales.summary.revenueCents).toBe(0)
    expect(data.sales.summary.revenueCents).toBe(3000)
    expect(data.nonMoving.days).toBe(30)
    expect(data.cashCuts.rows.length).toBeGreaterThan(0)
  })

  test('a refused period or warehouse comes back as a message next to the filters, without data', async () => {
    const fx = await setupReports()
    const badDates = await getOwnerDashboard(fx.owner, {
      period: { preset: 'custom', from: '2026-11-09', to: '2026-11-01' },
    })
    expect(badDates.data).toBeUndefined()
    expect(badDates.error).toBe(
      'La fecha inicial no puede ser posterior a la final.',
    )
    expect(badDates.warehouses).toHaveLength(2)
    const noWarehouse = await getOwnerDashboard(fx.owner, {
      ...wide,
      warehouseId: '00000000-0000-0000-0000-000000000000',
    })
    expect(noWarehouse.data).toBeUndefined()
    expect(noWarehouse.error).toBe('No tienes permiso para esta acción.')
  })

  test('only the owner can read it', async () => {
    const fx = await setupReports()
    expect(
      await errorOf(() => getOwnerDashboard(fx.managerA, wide)),
    ).toMatchObject({
      code: 'forbidden',
    })
    expect(
      await errorOf(() => getOwnerDashboard(fx.staffA, wide)),
    ).toMatchObject({ code: 'forbidden' })
  })
})
