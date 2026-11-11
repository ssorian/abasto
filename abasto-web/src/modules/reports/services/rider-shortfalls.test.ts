import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { closeCashSession } from '#/modules/cash/services/cash-sessions'
import {
  assignRider,
  settleAssignment,
} from '#/modules/riders/services/assignments'
import { createRider } from '#/modules/riders/services/riders'
import { getCashCuts } from '#/modules/reports/services/cash-cuts'
import { getManagerDashboard } from '#/modules/reports/services/manager-dashboard'
import { getOwnerDashboard } from '#/modules/reports/services/owner-dashboard'
import { getSalesReport } from '#/modules/reports/services/sales-report'
import {
  errorOf,
  receive,
  setupReports,
  useClock,
} from '#/modules/reports/services/testing'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const today = { period: { preset: 'today' as const } }

/** Luis: two short deliveries (−3000, −1000); Marta: one over (+500). Each delivery is worth 10 000. */
async function scenario() {
  const fx = await setupReports()
  await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
  const luis = await createRider(fx.managerA, {
    warehouseId: fx.a.id,
    name: 'Luis',
  })
  const marta = await createRider(fx.managerA, {
    warehouseId: fx.a.id,
    name: 'Marta',
  })
  const deliver = async (riderId: string, deliveredCents: number) => {
    const detail = await assignRider(fx.staffA, {
      riderId,
      lines: [{ productId: fx.milkBox.id, boxes: 0, units: 10 }],
    })
    return settleAssignment(fx.staffA, {
      assignmentId: detail.id,
      deliveredCents,
      lines: [{ lineId: detail.lines[0].id, boxes: 0, units: 0 }],
    })
  }
  await deliver(luis.id, 7_000)
  await deliver(luis.id, 9_000)
  await deliver(marta.id, 10_500)
  return { fx, luis, marta }
}

describe('rider shortfalls in the cash cuts report', () => {
  test('nets shortage and surplus by rider for the period, worst first', async () => {
    const { fx, luis, marta } = await scenario()
    const report = await getCashCuts(fx.owner, {
      ...today,
      warehouseIds: [fx.a.id],
    })
    expect(report.riderShortfalls).toEqual([
      {
        riderId: luis.id,
        riderName: 'Luis',
        warehouseId: fx.a.id,
        warehouseName: 'Almacén A',
        deliveries: 2,
        shortfallCents: 4_000,
        surplusCents: 0,
        netCents: -4_000,
      },
      {
        riderId: marta.id,
        riderName: 'Marta',
        warehouseId: fx.a.id,
        warehouseName: 'Almacén A',
        deliveries: 1,
        shortfallCents: 0,
        surplusCents: 500,
        netCents: 500,
      },
    ])
  })

  test('sales equal the sold value, the difference is its own column and expected cash is what was handed in', async () => {
    const { fx } = await scenario()
    const cuts = await getCashCuts(fx.owner, {
      ...today,
      warehouseIds: [fx.a.id],
    })
    expect(cuts.rows[0]).toMatchObject({
      salesCents: 30_000,
      entriesCents: 0,
      withdrawalsCents: 0,
      riderDifferenceCents: -3_500,
      expectedCents: 26_500,
    })
    expect(cuts.totals.salesCents).toBe(30_000)
    const sales = await getSalesReport(fx.owner, {
      ...today,
      warehouseIds: [fx.a.id],
    })
    expect(sales.summary.revenueCents).toBe(30_000)
    await closeCashSession(fx.staffA, {
      warehouseId: fx.a.id,
      countedCents: 26_500,
    })
    const closed = await getCashCuts(fx.owner, {
      ...today,
      warehouseIds: [fx.a.id],
    })
    expect(closed.rows[0]).toMatchObject({
      status: 'closed',
      expectedCents: 26_500,
      differenceCents: 0,
      riderDifferenceCents: -3_500,
    })
  })

  test('a manager sees their warehouse only and is refused another one', async () => {
    const { fx } = await scenario()
    const own = await getManagerDashboard(fx.managerA, {
      ...today,
      warehouseId: fx.a.id,
    })
    expect(own.cash.riderShortfalls.map((row) => row.riderName)).toEqual([
      'Luis',
      'Marta',
    ])
    const refused = await errorOf(() =>
      getCashCuts(fx.managerA, { ...today, warehouseIds: [fx.b.id] }),
    )
    expect(refused).toMatchObject({ code: 'forbidden' })
    const refusedDashboard = await errorOf(() =>
      getManagerDashboard(fx.managerA, { ...today, warehouseId: fx.b.id }),
    )
    expect(refusedDashboard).toMatchObject({ code: 'forbidden' })
    // The other warehouse's manager does not see A's riders.
    const other = await getCashCuts(fx.managerB, today)
    expect(other.riderShortfalls).toEqual([])
  })

  test('the owner dashboard carries the shortfalls and narrows by warehouse', async () => {
    const { fx } = await scenario()
    const all = await getOwnerDashboard(fx.owner, today)
    expect(
      all.data!.cashCuts.riderShortfalls.map((row) => row.riderName),
    ).toEqual(['Luis', 'Marta'])
    const onlyB = await getOwnerDashboard(fx.owner, {
      ...today,
      warehouseId: fx.b.id,
    })
    expect(onlyB.data!.cashCuts.riderShortfalls).toEqual([])
    const refused = await errorOf(() => getOwnerDashboard(fx.managerA, today))
    expect(refused).toMatchObject({ code: 'forbidden' })
  })
})
