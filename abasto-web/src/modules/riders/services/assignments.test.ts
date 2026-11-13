import { beforeEach, describe, expect, test } from 'bun:test'
import { asc, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { cashMovements } from '#/modules/cash/db/schema'
import { closeCashSession } from '#/modules/cash/services/cash-sessions'
import { lots, stockMovements } from '#/modules/inventory/db/schema'
import { getWarehouseStock } from '#/modules/inventory/services/stock-reads'
import { ledgerSum } from '#/modules/inventory/services/testing'
import { setPrices } from '#/modules/pricing/services/prices'
import {
  assignRider,
  cancelAssignment,
  settleAssignment,
} from '#/modules/riders/services/assignments'
import {
  getAssignment,
  listAssignments,
} from '#/modules/riders/services/assignment-reads'
import { setRiderActive } from '#/modules/riders/services/riders'
import {
  errorOf,
  receive,
  riderState,
  setupRiders,
} from '#/modules/riders/services/testing'

beforeEach(() => resetDatabase(db))

/** Two lots of milk in A: 300 units each, the first received is the oldest. */
async function setup() {
  const fx = await setupRiders()
  const first = await receive(fx, { productId: fx.milkBox.id, quantity: 300 })
  const second = await receive(fx, { productId: fx.milkBox.id, quantity: 300 })
  const lotOf = async (id: string) =>
    (await db.select().from(lots).where(eq(lots.id, id)))[0]
  const assign = (boxes: number, units: number, riderId = fx.rider.id) =>
    assignRider(fx.staffA, {
      riderId,
      lines: [{ productId: fx.milkBox.id, boxes, units }],
    })
  return { fx, first, second, lotOf, assign }
}

describe('assignRider', () => {
  test('converts boxes plus units to base units and reserves FIFO without selling', async () => {
    const { fx, first, second, lotOf, assign } = await setup()
    const detail = await assign(40, 20)
    expect(detail.status).toBe('En ruta')
    expect(detail.riderName).toBe('Luis')
    expect(detail.lines).toHaveLength(1)
    expect(detail.lines[0]).toMatchObject({
      productId: fx.milkBox.id,
      boxFactor: 12,
      assignedQuantity: 500,
      leftoverQuantity: null,
    })
    expect(
      detail.lines[0].allocations.map((a) => [a.lotId, a.quantity]),
    ).toEqual([
      [first.id, 300],
      [second.id, 200],
    ])
    expect(await lotOf(first.id)).toMatchObject({ onHand: 300, reserved: 300 })
    expect(await lotOf(second.id)).toMatchObject({ onHand: 300, reserved: 200 })
    // Nothing is sold yet: no sale movement, no cash.
    expect(
      await db
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.type, 'sale')),
    ).toHaveLength(0)
    expect(await db.select().from(cashMovements)).toHaveLength(0)
  })

  test('units only and boxes only both work; an empty line is refused', async () => {
    const { fx, assign } = await setup()
    expect((await assign(0, 7)).lines[0].assignedQuantity).toBe(7)
    const state = await riderState()
    for (const [boxes, units] of [
      [0, 0],
      [-1, 5],
      [1.5, 0],
    ]) {
      expect(
        (await errorOf(() => assign(boxes, units, fx.other.id))).code,
      ).toBe('invalid')
    }
    expect(
      (
        await errorOf(() =>
          assignRider(fx.staffA, { riderId: fx.other.id, lines: [] }),
        )
      ).code,
    ).toBe('invalid')
    expect(await riderState()).toEqual(state)
    expect((await assign(2, 0, fx.other.id)).lines[0].assignedQuantity).toBe(24)
  })

  test('refuses when stock is insufficient and changes nothing', async () => {
    const { fx, assign } = await setup()
    const state = await riderState()
    const error = await errorOf(() => assign(50, 1)) // 601 > 600
    expect(error.code).toBe('conflict')
    expect(error.message).toContain('Leche entera 1L')
    expect(await riderState()).toEqual(state)
    await assign(50, 0) // exactly 600 still works
    expect((await errorOf(() => assign(0, 1, fx.other.id))).code).toBe(
      'conflict',
    )
  })

  test('units held by a rider are unavailable to orders and other riders', async () => {
    const { fx, assign } = await setup()
    await assign(40, 20)
    const error = await errorOf(() => assign(0, 101, fx.other.id))
    expect(error.code).toBe('conflict')
    await assign(0, 100, fx.other.id)
  })

  test('warehouse stock reports the units in route apart from order reservations', async () => {
    const { fx, assign } = await setup()
    const detail = await assign(40, 20)
    const stockOf = async () =>
      (await getWarehouseStock(fx.staffA, fx.a.id)).find(
        (row) => row.productId === fx.milkBox.id,
      )
    expect(await stockOf()).toMatchObject({
      onHand: 600,
      inRoute: 500,
      reserved: 0,
      available: 100,
    })
    await settleAssignment(fx.staffA, {
      assignmentId: detail.id,
      deliveredCents: 0,
      lines: [{ lineId: detail.lines[0].id, boxes: 0, units: 500 }],
    })
    expect(await stockOf()).toMatchObject({
      onHand: 600,
      inRoute: 0,
      available: 600,
    })
  })

  test('refuses a second open assignment for the same rider and an inactive rider', async () => {
    const { fx, assign } = await setup()
    await assign(1, 0)
    const state = await riderState()
    expect((await errorOf(() => assign(1, 0))).message).toBe(
      'Este repartidor ya tiene un reparto en ruta.',
    )
    await setRiderActive(fx.managerA, { riderId: fx.other.id, active: false })
    expect((await errorOf(() => assign(1, 0, fx.other.id))).message).toBe(
      'Este repartidor está inactivo.',
    )
    expect(await riderState()).toEqual({
      ...state,
      riders: expect.anything(),
    })
  })

  test('access: foreign manager and customer refused, malformed rider id not found', async () => {
    const { fx } = await setup()
    const state = await riderState()
    const input = {
      riderId: fx.rider.id,
      lines: [{ productId: fx.milkBox.id, boxes: 1, units: 0 }],
    }
    expect((await errorOf(() => assignRider(fx.managerB, input))).code).toBe(
      'forbidden',
    )
    expect(
      (await errorOf(() => assignRider(fx.customerActor, input))).code,
    ).toBe('forbidden')
    expect(
      (await errorOf(() => assignRider(fx.owner, { ...input, riderId: 'x' })))
        .code,
    ).toBe('not_found')
    expect(await riderState()).toEqual(state)
    await assignRider(fx.owner, input)
  })
})

describe('settleAssignment', () => {
  test('releases the leftover, sells the rest and posts one cash sale from frozen prices', async () => {
    const { fx, first, second, lotOf, assign } = await setup()
    const detail = await assign(40, 20) // 500 units
    // The price changes after assignment: the frozen one must be used.
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.pieceId, priceCents: 2000 }],
    })
    const settled = await settleAssignment(fx.staffA, {
      assignmentId: detail.id,
      deliveredCents: 470_000,
      lines: [{ lineId: detail.lines[0].id, boxes: 2, units: 6 }], // 30 back
    })
    expect(settled).toMatchObject({
      status: 'Liquidada',
      expectedCents: 470_000,
      deliveredCents: 470_000,
      differenceCents: 0,
    })
    expect(settled.lines[0]).toMatchObject({
      assignedQuantity: 500,
      leftoverQuantity: 30,
      soldQuantity: 470,
    })
    // Sold from the oldest allocations first; the leftover is the tail.
    expect(await lotOf(first.id)).toMatchObject({ onHand: 0, reserved: 0 })
    expect(await lotOf(second.id)).toMatchObject({ onHand: 130, reserved: 0 })
    const sales = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.type, 'sale'))
      .orderBy(asc(stockMovements.lotId))
    expect(sales.map((s) => s.quantity).sort()).toEqual([-170, -300])
    expect(sales.every((s) => s.reference === detail.id)).toBe(true)
    const cash = await db.select().from(cashMovements)
    expect(cash).toHaveLength(1)
    expect(cash[0]).toMatchObject({
      type: 'sale',
      amountCents: 470_000,
      warehouseId: fx.a.id,
      actorId: fx.staffA.userId,
    })
    expect(settled.cashMovementId).toBe(cash[0].id)
    expect(await ledgerSum(first.id)).toBe(0)
    expect(await ledgerSum(second.id)).toBe(130)
  })

  test('uses each lot price frozen at assignment', async () => {
    const fx = await setupRiders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 100 }) // standard 1000
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 100,
      salePriceCents: 900,
    })
    const detail = await assignRider(fx.staffA, {
      riderId: fx.rider.id,
      lines: [{ productId: fx.milkBox.id, boxes: 0, units: 150 }],
    })
    const settled = await settleAssignment(fx.staffA, {
      assignmentId: detail.id,
      deliveredCents: 145_000,
      lines: [{ lineId: detail.lines[0].id, boxes: 0, units: 0 }],
    })
    expect(settled.expectedCents).toBe(100 * 1000 + 50 * 900)
    expect(settled.differenceCents).toBe(0)
  })

  test('stores a shortage and a surplus as delivered minus expected', async () => {
    const { fx, assign } = await setup()
    const a = await assign(0, 10)
    const short = await settleAssignment(fx.staffA, {
      assignmentId: a.id,
      deliveredCents: 9_000,
      lines: [{ lineId: a.lines[0].id, boxes: 0, units: 0 }],
    })
    expect(short).toMatchObject({
      expectedCents: 10_000,
      deliveredCents: 9_000,
      differenceCents: -1_000,
    })
    const b = await assign(0, 10, fx.other.id)
    const over = await settleAssignment(fx.staffA, {
      assignmentId: b.id,
      deliveredCents: 10_500,
      lines: [{ lineId: b.lines[0].id, boxes: 0, units: 0 }],
    })
    expect(over.differenceCents).toBe(500)
    // The drawer records both sales at the sold value and each difference apart.
    const moves = (await db.select().from(cashMovements)).map(
      (m) => `${m.type}:${m.amountCents}`,
    )
    expect(moves.sort()).toEqual([
      'rider_difference:-1000',
      'rider_difference:500',
      'sale:10000',
      'sale:10000',
    ])
  })

  test('nothing handed in: the sale is recorded and offset by the full shortage', async () => {
    const { fx, assign } = await setup()
    const a = await assign(0, 10)
    const settled = await settleAssignment(fx.staffA, {
      assignmentId: a.id,
      deliveredCents: 0,
      lines: [{ lineId: a.lines[0].id, boxes: 0, units: 0 }],
    })
    expect(settled).toMatchObject({
      expectedCents: 10_000,
      deliveredCents: 0,
      differenceCents: -10_000,
    })
    expect(settled.cashMovementId).not.toBeNull()
    const net = (await db.select().from(cashMovements)).reduce(
      (sum, m) => sum + m.amountCents,
      0,
    )
    expect(net).toBe(0)
  })

  test('everything back: all units released, no sale, no cash movement', async () => {
    const { fx, first, lotOf, assign } = await setup()
    const detail = await assign(0, 40)
    const settled = await settleAssignment(fx.staffA, {
      assignmentId: detail.id,
      deliveredCents: 0,
      lines: [{ lineId: detail.lines[0].id, boxes: 0, units: 40 }],
    })
    expect(settled).toMatchObject({
      status: 'Liquidada',
      expectedCents: 0,
      differenceCents: 0,
      cashMovementId: null,
    })
    expect(await lotOf(first.id)).toMatchObject({ onHand: 300, reserved: 0 })
    expect(await db.select().from(cashMovements)).toHaveLength(0)
    expect(
      await db
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.type, 'sale')),
    ).toHaveLength(0)
  })

  test('refuses leftover above assigned or malformed amounts and changes nothing', async () => {
    const { fx, assign } = await setup()
    const detail = await assign(1, 0) // 12
    const lineId = detail.lines[0].id
    const state = await riderState()
    const settle = (
      lines: Array<{ lineId: string; boxes: number; units: number }>,
      deliveredCents = 0,
    ) =>
      settleAssignment(fx.staffA, {
        assignmentId: detail.id,
        deliveredCents,
        lines,
      })
    expect(
      (await errorOf(() => settle([{ lineId, boxes: 0, units: 13 }]))).code,
    ).toBe('invalid')
    expect(
      (await errorOf(() => settle([{ lineId, boxes: 2, units: 0 }]))).code,
    ).toBe('invalid')
    expect(
      (await errorOf(() => settle([{ lineId, boxes: -1, units: 0 }]))).code,
    ).toBe('invalid')
    expect((await errorOf(() => settle([]))).code).toBe('invalid')
    expect(
      (await errorOf(() => settle([{ lineId: 'x', boxes: 0, units: 0 }]))).code,
    ).toBe('invalid')
    expect(
      (await errorOf(() => settle([{ lineId, boxes: 0, units: 0 }], -5))).code,
    ).toBe('invalid')
    expect(await riderState()).toEqual(state)
  })

  test('refuses without an open cash session and changes nothing', async () => {
    const { fx, assign } = await setup()
    const detail = await assign(0, 10)
    await closeCashSession(fx.staffA, { warehouseId: fx.a.id, countedCents: 0 })
    const state = await riderState()
    const error = await errorOf(() =>
      settleAssignment(fx.staffA, {
        assignmentId: detail.id,
        deliveredCents: 10_000,
        lines: [{ lineId: detail.lines[0].id, boxes: 0, units: 0 }],
      }),
    )
    expect(error.message).toBe('No hay una caja abierta en este almacén.')
    expect(await riderState()).toEqual(state)
    expect((await getAssignment(fx.staffA, detail.id)).status).toBe('En ruta')
  })

  test('cannot be settled twice', async () => {
    const { fx, assign } = await setup()
    const detail = await assign(0, 10)
    const input = {
      assignmentId: detail.id,
      deliveredCents: 10_000,
      lines: [{ lineId: detail.lines[0].id, boxes: 0, units: 0 }],
    }
    await settleAssignment(fx.staffA, input)
    const state = await riderState()
    expect(
      (await errorOf(() => settleAssignment(fx.staffA, input))).message,
    ).toBe('Este reparto ya no está en ruta.')
    expect(await riderState()).toEqual(state)
  })

  test('access: foreign manager and customer refused, unknown ids not found', async () => {
    const { fx, assign } = await setup()
    const detail = await assign(0, 10)
    const input = {
      assignmentId: detail.id,
      deliveredCents: 0,
      lines: [{ lineId: detail.lines[0].id, boxes: 0, units: 0 }],
    }
    const state = await riderState()
    expect(
      (await errorOf(() => settleAssignment(fx.managerB, input))).code,
    ).toBe('forbidden')
    expect(
      (await errorOf(() => settleAssignment(fx.customerActor, input))).code,
    ).toBe('forbidden')
    expect(
      (
        await errorOf(() =>
          settleAssignment(fx.owner, { ...input, assignmentId: 'nope' }),
        )
      ).code,
    ).toBe('not_found')
    expect(await riderState()).toEqual(state)
  })
})

describe('cancelAssignment', () => {
  test('releases every reserved unit, moves no stock and no cash', async () => {
    const { fx, first, second, lotOf, assign } = await setup()
    const detail = await assign(40, 20)
    const cancelled = await cancelAssignment(fx.staffA, {
      assignmentId: detail.id,
    })
    expect(cancelled.status).toBe('Cancelada')
    expect(cancelled.closedAt).toBeInstanceOf(Date)
    expect(await lotOf(first.id)).toMatchObject({ onHand: 300, reserved: 0 })
    expect(await lotOf(second.id)).toMatchObject({ onHand: 300, reserved: 0 })
    expect(
      await db
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.type, 'sale')),
    ).toHaveLength(0)
    expect(await db.select().from(cashMovements)).toHaveLength(0)
    // The rider is free again.
    await assign(1, 0)
  })

  test('settle after cancel and cancel after settle or cancel are refused', async () => {
    const { fx, assign } = await setup()
    const a = await assign(0, 10)
    await cancelAssignment(fx.staffA, { assignmentId: a.id })
    const state = await riderState()
    expect(
      (
        await errorOf(() =>
          settleAssignment(fx.staffA, {
            assignmentId: a.id,
            deliveredCents: 0,
            lines: [{ lineId: a.lines[0].id, boxes: 0, units: 0 }],
          }),
        )
      ).message,
    ).toBe('Este reparto ya no está en ruta.')
    expect(
      (await errorOf(() => cancelAssignment(fx.staffA, { assignmentId: a.id })))
        .code,
    ).toBe('conflict')
    expect(await riderState()).toEqual(state)
    const b = await assign(0, 10)
    await settleAssignment(fx.staffA, {
      assignmentId: b.id,
      deliveredCents: 10_000,
      lines: [{ lineId: b.lines[0].id, boxes: 0, units: 0 }],
    })
    expect(
      (await errorOf(() => cancelAssignment(fx.staffA, { assignmentId: b.id })))
        .code,
    ).toBe('conflict')
  })

  test('access: foreign manager and customer refused', async () => {
    const { fx, assign } = await setup()
    const a = await assign(0, 10)
    const state = await riderState()
    for (const actor of [fx.managerB, fx.customerActor]) {
      expect(
        (await errorOf(() => cancelAssignment(actor, { assignmentId: a.id })))
          .code,
      ).toBe('forbidden')
    }
    expect(
      (await errorOf(() => cancelAssignment(fx.owner, { assignmentId: 'x' })))
        .code,
    ).toBe('not_found')
    expect(await riderState()).toEqual(state)
  })
})

describe('reads', () => {
  test('lists a warehouse’s assignments by status and gets one with its lines', async () => {
    const { fx, assign } = await setup()
    const open = await assign(0, 10)
    const done = await assign(0, 5, fx.other.id)
    await cancelAssignment(fx.staffA, { assignmentId: done.id })
    const all = await listAssignments(fx.staffA, { warehouseId: fx.a.id })
    expect(all.map((a) => [a.id, a.status, a.riderName]).sort()).toEqual(
      [
        [open.id, 'En ruta', 'Luis'],
        [done.id, 'Cancelada', 'Marta'],
      ].sort(),
    )
    const onRoad = await listAssignments(fx.staffA, {
      warehouseId: fx.a.id,
      status: 'En ruta',
    })
    expect(onRoad.map((a) => a.id)).toEqual([open.id])
    expect((await getAssignment(fx.staffA, open.id)).lines).toHaveLength(1)
    expect(
      (
        await errorOf(() =>
          listAssignments(fx.managerB, { warehouseId: fx.a.id }),
        )
      ).code,
    ).toBe('forbidden')
    expect(
      (await errorOf(() => getAssignment(fx.managerB, open.id))).code,
    ).toBe('forbidden')
    expect((await errorOf(() => getAssignment(fx.owner, 'nope'))).code).toBe(
      'not_found',
    )
  })
})

describe('settleAssignment with a piece price', () => {
  /** Water sells by the box (12): box 440.00, loose piece 38.00 (own prices). */
  async function setupWater(piecePrice: number | null = 3800) {
    const fx = await setupRiders()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [
        { presentationId: fx.box(fx.water).id, priceCents: 44_000 },
        ...(piecePrice === null
          ? []
          : [
              { presentationId: fx.piece(fx.water).id, priceCents: piecePrice },
            ]),
      ],
    })
    const assign = (
      boxes: number,
      units: number,
      lotsToReceive: Array<{ quantity: number; salePriceCents?: number }> = [
        { quantity: 100 },
      ],
    ) =>
      (async () => {
        for (const lot of lotsToReceive) {
          await receive(fx, { productId: fx.water.id, ...lot })
        }
        return assignRider(fx.staffA, {
          riderId: fx.rider.id,
          lines: [{ productId: fx.water.id, boxes, units }],
        })
      })()
    const settle = (
      detail: Awaited<ReturnType<typeof assign>>,
      boxes: number,
      units: number,
    ) =>
      settleAssignment(fx.staffA, {
        assignmentId: detail.id,
        deliveredCents: 0,
        lines: [{ lineId: detail.lines[0].id, boxes, units }],
      })
    return { fx, assign, settle }
  }

  test('charges whole boxes at the box price and loose pieces at the piece price', async () => {
    const { assign, settle } = await setupWater()
    const detail = await assign(2, 5) // 29 pieces
    const settled = await settle(detail, 0, 0)
    // 2 boxes × 440.00 + 5 pieces × 38.00, not 29 × 440 / 12.
    expect(settled.expectedCents).toBe(2 * 44_000 + 5 * 3800)
  })

  test('sold pieces beyond whole boxes are priced loose after a leftover', async () => {
    const { assign, settle } = await setupWater()
    const detail = await assign(2, 5)
    const settled = await settle(detail, 0, 4) // 25 sold = 2 boxes + 1 piece
    expect(settled.expectedCents).toBe(2 * 44_000 + 3800)
  })

  test('uses the piece price frozen at assignment, not the current one', async () => {
    const { fx, assign, settle } = await setupWater()
    const detail = await assign(0, 5)
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.piece(fx.water).id, priceCents: 9900 }],
    })
    expect((await settle(detail, 0, 0)).expectedCents).toBe(5 * 3800)
  })

  test('prorates the box price when the product has no piece price', async () => {
    const { assign, settle } = await setupWater(null)
    const detail = await assign(2, 5)
    // 29 × 44000 / 12 = 106333.33 → 106333
    expect((await settle(detail, 0, 0)).expectedCents).toBe(106_333)
  })

  test('a piece price frozen from the old derived one charges loose pieces at the warehouse piece price, even from a dearer lot', async () => {
    const { assign, settle } = await setupWater(null)
    // Migration 0034 gives the piece its own price: 44000 / 12 = 3666.67 → 3667.
    await db.execute(
      sql.raw(
        await Bun.file(
          new URL(
            '../../../../drizzle/0034_freeze_derived_prices.sql',
            import.meta.url,
          ),
        ).text(),
      ),
    )
    const detail = await assign(2, 5, [
      { quantity: 100, salePriceCents: 48_000 },
    ])
    // 2 boxes at the lot price, 5 loose pieces at the piece price, not 480 / 12.
    expect((await settle(detail, 0, 0)).expectedCents).toBe(
      2 * 48_000 + 5 * 3667,
    )
  })

  test('a box that spans two lots is prorated per lot; the loose pieces are the newest', async () => {
    const { assign, settle } = await setupWater()
    const detail = await assign(2, 6, [
      { quantity: 20 },
      { quantity: 20, salePriceCents: 48_000 },
    ]) // 30 pieces: 20 in the first lot, 10 in the second
    const settled = await settle(detail, 0, 0)
    // First 24 pieces are boxes: 20 at 440/12 + 4 at 480/12; last 6 are loose.
    expect(settled.expectedCents).toBe(73_333 + 16_000 + 6 * 3800)
  })
})
