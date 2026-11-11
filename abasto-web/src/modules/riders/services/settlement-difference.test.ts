import { beforeEach, describe, expect, test } from 'bun:test'
import { asc } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { cashMovements } from '#/modules/cash/db/schema'
import {
  closeCashSession,
  getOpenCashSession,
} from '#/modules/cash/services/cash-sessions'
import { movementLabel } from '#/modules/cash/lib/cash-summary'
import { getSalesReport } from '#/modules/reports/services/sales-report'
import {
  assignRider,
  settleAssignment,
} from '#/modules/riders/services/assignments'
import { riderAssignments } from '#/modules/riders/db/schema'
import { receive, setupRiders } from '#/modules/riders/services/testing'

beforeEach(() => resetDatabase(db))

/** 100 milk units at 1000 cents; a delivery of 10 units is worth 10 000 cents. */
async function settle(deliveredCents: number) {
  const fx = await setupRiders()
  await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
  const detail = await assignRider(fx.staffA, {
    riderId: fx.rider.id,
    lines: [{ productId: fx.milkBox.id, boxes: 0, units: 10 }],
  })
  const settled = await settleAssignment(fx.staffA, {
    assignmentId: detail.id,
    deliveredCents,
    lines: [{ lineId: detail.lines[0].id, boxes: 0, units: 0 }],
  })
  const movements = await db
    .select()
    .from(cashMovements)
    .orderBy(asc(cashMovements.createdAt), asc(cashMovements.id))
  return { fx, settled, movements }
}

const today = { period: { preset: 'today' as const } }

async function salesTotal(fx: Awaited<ReturnType<typeof settle>>['fx']) {
  const report = await getSalesReport(fx.owner, today)
  const sales = (await db.select().from(cashMovements))
    .filter((m) => m.type === 'sale')
    .reduce((sum, m) => sum + m.amountCents, 0)
  return { report: report.summary.revenueCents, cash: sales }
}

describe('settling a delivery records the sale at the sold value', () => {
  test('exact amount: one sale movement and no difference movement', async () => {
    const { fx, settled, movements } = await settle(10_000)
    expect(movements.map((m) => [m.type, m.amountCents])).toEqual([
      ['sale', 10_000],
    ])
    expect(settled.cashMovementId).toBe(movements[0].id)
    const [row] = await db.select().from(riderAssignments)
    expect(row.differenceMovementId).toBeNull()
    expect(await salesTotal(fx)).toEqual({ report: 10_000, cash: 10_000 })
  })

  test('short: sale at the expected value plus a negative Faltante; net cash is what was handed in', async () => {
    const { fx, settled, movements } = await settle(7_000)
    expect(movements.map((m) => [m.type, m.amountCents])).toEqual([
      ['sale', 10_000],
      ['rider_difference', -3_000],
    ])
    expect(movements[1].reason).toBe('Faltante de reparto · Luis')
    expect(movementLabel(movements[1].type, movements[1].amountCents)).toBe(
      'Faltante de reparto',
    )
    expect(movements[1].warehouseId).toBe(fx.a.id)
    expect(movements[1].actorId).toBe(fx.staffA.userId)
    expect(settled.cashMovementId).toBe(movements[0].id)
    const [row] = await db.select().from(riderAssignments)
    expect(row.differenceMovementId).toBe(movements[1].id)
    expect(row.differenceCents).toBe(-3_000)
    expect(await salesTotal(fx)).toEqual({ report: 10_000, cash: 10_000 })
    // Net cash in is the cash handed in, so the close expects exactly that.
    const open = await getOpenCashSession(fx.staffA, fx.a.id)
    expect(open!.expectedCents).toBe(7_000)
    const closed = await closeCashSession(fx.staffA, {
      warehouseId: fx.a.id,
      countedCents: 7_000,
    })
    expect(closed).toMatchObject({ expectedCents: 7_000, differenceCents: 0 })
  })

  test('over: sale at the expected value plus a positive Sobrante', async () => {
    const { fx, movements } = await settle(10_500)
    expect(movements.map((m) => [m.type, m.amountCents])).toEqual([
      ['sale', 10_000],
      ['rider_difference', 500],
    ])
    expect(movements[1].reason).toBe('Sobrante de reparto · Luis')
    expect(movementLabel(movements[1].type, movements[1].amountCents)).toBe(
      'Sobrante de reparto',
    )
    expect(await salesTotal(fx)).toEqual({ report: 10_000, cash: 10_000 })
    expect((await getOpenCashSession(fx.staffA, fx.a.id))!.expectedCents).toBe(
      10_500,
    )
  })

  test('nothing handed in: the sale is still recorded, offset by a full Faltante', async () => {
    const { settled, movements } = await settle(0)
    expect(movements.map((m) => [m.type, m.amountCents])).toEqual([
      ['sale', 10_000],
      ['rider_difference', -10_000],
    ])
    expect(settled.cashMovementId).toBe(movements[0].id)
  })

  test('the database refuses a zero difference movement', async () => {
    const { fx, movements } = await settle(10_000)
    const failure = await db
      .insert(cashMovements)
      .values({
        sessionId: movements[0].sessionId,
        warehouseId: fx.a.id,
        type: 'rider_difference',
        amountCents: 0,
        actorId: fx.staffA.userId,
      })
      .then(
        () => null,
        (error: unknown) => error,
      )
    expect(failure).not.toBeNull()
  })
})
