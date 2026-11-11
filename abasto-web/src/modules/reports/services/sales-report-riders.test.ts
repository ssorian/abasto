import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { cashMovements } from '#/modules/cash/db/schema'
import { getMarginReport } from '#/modules/executive/services/profitability'
import {
  assignRider,
  cancelAssignment,
  settleAssignment,
} from '#/modules/riders/services/assignments'
import { createRider } from '#/modules/riders/services/riders'
import { getSalesReport } from '#/modules/reports/services/sales-report'
import {
  receive,
  setupReports,
  useClock,
} from '#/modules/reports/services/testing'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const wide = {
  period: { preset: 'custom' as const, from: '2026-11-01', to: '2026-11-30' },
}

describe('sales report with rider deliveries', () => {
  test('settled deliveries count as Reparto sales and total what the cash box shows', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 100,
      totalCostCents: 5000,
    })
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 100,
      totalCostCents: 2000,
      salePriceCents: 900,
    })
    await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 3 })
    const rider = await createRider(fx.managerA, {
      warehouseId: fx.a.id,
      name: 'Luis',
    })
    useClock(() => new Date('2026-11-03T18:00:00Z'))
    const assignment = await assignRider(fx.staffA, {
      riderId: rider.id,
      lines: [{ productId: fx.milkBox.id, boxes: 0, units: 150 }],
    })
    // 5 come back: 145 sold, 97 from the oldest lot and 48 from the next.
    const settled = await settleAssignment(fx.staffA, {
      assignmentId: assignment.id,
      deliveredCents: 97 * 1000 + 48 * 900,
      lines: [{ lineId: assignment.lines[0].id, boxes: 0, units: 5 }],
    })
    expect(settled.differenceCents).toBe(0)

    const report = await getSalesReport(fx.owner, wide)
    const sales = await db
      .select({ amountCents: cashMovements.amountCents })
      .from(cashMovements)
      .where(eq(cashMovements.type, 'sale'))
    const cashBox = sales.reduce((sum, row) => sum + row.amountCents, 0)
    expect(cashBox).toBe(3000 + settled.expectedCents!)
    expect(report.summary.revenueCents).toBe(cashBox)
    expect(report.summary.units).toBe(3 + 145)
    expect(report.summary.orders).toBe(2)
    expect(report.byChannel.map((row) => [row.name, row.revenueCents])).toEqual(
      [
        ['Mostrador', 3000],
        ['Reparto', settled.expectedCents!],
      ],
    )
    expect(report.byChannel[1]).toMatchObject({ orders: 1, units: 145 })
    // Rider cost: 97 units at 50 and 48 units at 20 → 5810 for the delivery.
    expect(report.byChannel[1].costCents).toBe(97 * 50 + 48 * 20)
    expect(report.byDay.map((row) => [row.key, row.revenueCents])).toEqual([
      ['2026-11-02', 3000],
      ['2026-11-03', settled.expectedCents!],
    ])
    expect(report.byProduct[0].revenueCents).toBe(cashBox)
    expect(report.byWarehouse[0].revenueCents).toBe(cashBox)
    // The owner's margin report shares the same lines.
    const margin = await getMarginReport(fx.owner, wide)
    expect(margin.summary.revenueCents).toBe(cashBox)
    expect(margin.summary.costCents).toBe(report.summary.costCents)
  })

  test('boxes are priced like the settlement does, and open or cancelled deliveries are not sales', async () => {
    const fx = await setupReports()
    await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 100,
      salePriceCents: 900,
    })
    const rider = await createRider(fx.managerA, {
      warehouseId: fx.a.id,
      name: 'Luis',
    })
    const other = await createRider(fx.managerA, {
      warehouseId: fx.a.id,
      name: 'Marta',
    })
    useClock(() => new Date('2026-11-03T18:00:00Z'))
    const settledAssignment = await assignRider(fx.staffA, {
      riderId: rider.id,
      lines: [{ productId: fx.milkBox.id, boxes: 12, units: 6 }], // 150 units
    })
    const cancelled = await assignRider(fx.staffA, {
      riderId: other.id,
      lines: [{ productId: fx.milkBox.id, boxes: 0, units: 10 }],
    })
    await cancelAssignment(fx.staffA, { assignmentId: cancelled.id })
    const before = await getSalesReport(fx.owner, wide)
    expect(before.summary).toMatchObject({ orders: 0, revenueCents: 0 })

    // 150 assigned, 7 come back: 143 sold = 11 boxes + 11 loose pieces.
    const settled = await settleAssignment(fx.staffA, {
      assignmentId: settledAssignment.id,
      deliveredCents: 100_000,
      lines: [{ lineId: settledAssignment.lines[0].id, boxes: 0, units: 7 }],
    })
    const report = await getSalesReport(fx.owner, wide)
    expect(settled.expectedCents).toBeGreaterThan(0)
    expect(report.summary.revenueCents).toBe(settled.expectedCents!)
    expect(report.summary.units).toBe(143)
    expect(report.summary.orders).toBe(1)
    expect(report.byChannel.map((row) => row.name)).toEqual(['Reparto'])
  })

  test('a delivery settled outside the period or in a hidden warehouse is left out', async () => {
    const fx = await setupReports()
    await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
    const rider = await createRider(fx.managerA, {
      warehouseId: fx.a.id,
      name: 'Luis',
    })
    useClock(() => new Date('2026-11-03T18:00:00Z'))
    const assignment = await assignRider(fx.staffA, {
      riderId: rider.id,
      lines: [{ productId: fx.milkBox.id, boxes: 0, units: 10 }],
    })
    await settleAssignment(fx.staffA, {
      assignmentId: assignment.id,
      deliveredCents: 10_000,
      lines: [{ lineId: assignment.lines[0].id, boxes: 0, units: 0 }],
    })
    const other = await getSalesReport(fx.owner, {
      period: { preset: 'custom', from: '2026-11-10', to: '2026-11-12' },
    })
    expect(other.summary.revenueCents).toBe(0)
    const hidden = await getSalesReport(fx.owner, {
      ...wide,
      warehouseIds: [fx.b.id],
    })
    expect(hidden.summary.revenueCents).toBe(0)
    const mine = await getSalesReport(fx.managerA, wide)
    expect(mine.summary.revenueCents).toBe(10_000)
  })
})
