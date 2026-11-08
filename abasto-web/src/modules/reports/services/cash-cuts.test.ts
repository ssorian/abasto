import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { cashMovements } from '#/modules/cash/db/schema'
import { resetDatabase } from '#/db/testing'
import {
  recordCashEntry,
  recordCashWithdrawal,
} from '#/modules/cash/services/cash-movements'
import { closeCashSession } from '#/modules/cash/services/cash-sessions'
import { getCashCuts } from '#/modules/reports/services/cash-cuts'
import {
  errorOf,
  farFuture,
  receive,
  setupReports,
  useClock,
} from '#/modules/reports/services/testing'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

async function scenario() {
  const fx = await setupReports()
  await receive(fx, {
    productId: fx.milkBox.id,
    quantity: 10,
    expiresOn: farFuture,
  })
  await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 3 })
  useClock(null)
  await recordCashEntry(fx.staffA, {
    warehouseId: fx.a.id,
    amountCents: 500,
    reason: 'Cambio',
  })
  await recordCashWithdrawal(fx.staffA, {
    warehouseId: fx.a.id,
    amountCents: 200,
    reason: 'Gasto',
  })
  await closeCashSession(fx.staffA, {
    warehouseId: fx.a.id,
    countedCents: 3250,
  })
  return fx
}

const today = { period: { preset: 'today' as const } }

describe('cash cuts', () => {
  test('a closed session reports expected, counted and difference', async () => {
    const fx = await scenario()
    const report = await getCashCuts(fx.owner, {
      ...today,
      warehouseIds: [fx.a.id],
    })
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]).toMatchObject({
      warehouseId: fx.a.id,
      warehouseName: 'Almacén A',
      status: 'closed',
      openingCents: 0,
      salesCents: 3000,
      entriesCents: 500,
      withdrawalsCents: 200,
      expectedCents: 3300,
      countedCents: 3250,
      differenceCents: -50,
      openedByName: 'cajero-a',
      closedByName: 'cajero-a',
    })
    expect(report.totals).toEqual({
      sessions: 1,
      salesCents: 3000,
      expectedCents: 3300,
      countedCents: 3250,
      differenceCents: -50,
    })
  })

  test('an open session shows its running expected cash and no count', async () => {
    const fx = await scenario()
    const report = await getCashCuts(fx.owner, today)
    const open = report.rows.find((row) => row.warehouseId === fx.b.id)
    expect(open).toMatchObject({
      status: 'open',
      expectedCents: 0,
      countedCents: null,
      differenceCents: null,
      closedByName: null,
    })
    expect(report.rows).toHaveLength(2)
    // Open sessions have no difference yet, so they stay out of the totals.
    expect(report.totals.differenceCents).toBe(-50)
    expect(report.totals.sessions).toBe(2)
  })

  test('a legacy abono row still counts toward the running expected cash', async () => {
    const fx = await scenario()
    const open = (await getCashCuts(fx.owner, today)).rows.find(
      (row) => row.warehouseId === fx.b.id,
    )!
    // No service creates abonos anymore; old rows stay immutable history.
    await db.insert(cashMovements).values({
      sessionId: open.sessionId,
      warehouseId: fx.b.id,
      type: 'abono',
      amountCents: 700,
      actorId: fx.owner.userId,
    })
    const after = (await getCashCuts(fx.owner, today)).rows.find(
      (row) => row.sessionId === open.sessionId,
    )
    expect(after).toMatchObject({ entriesCents: 700, expectedCents: 700 })
  })

  test('sessions outside the period or warehouse scope are left out', async () => {
    const fx = await scenario()
    const old = await getCashCuts(fx.owner, {
      period: { preset: 'custom', from: '2020-01-01', to: '2020-01-31' },
    })
    expect(old.rows).toEqual([])
    const own = await getCashCuts(fx.managerA, today)
    expect(own.rows.map((row) => row.warehouseId)).toEqual([fx.a.id])
    expect(
      await errorOf(() =>
        getCashCuts(fx.managerA, { ...today, warehouseIds: [fx.b.id] }),
      ),
    ).toMatchObject({ code: 'forbidden' })
  })
})
