import { beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { cashMovements } from '#/modules/cash/db/schema'
import {
  closeCashSession,
  getOpenCashSession,
  listCashSessions,
  openCashSession,
} from '#/modules/cash/services/cash-sessions'
import {
  recordCashEntry,
  recordCashWithdrawal,
} from '#/modules/cash/services/cash-movements'
import { errorOf, setupInventory } from '#/modules/inventory/services/testing'
import { paymentState } from '#/modules/credit/services/testing'

beforeEach(() => resetDatabase(db))

const noSession = 'No hay una caja abierta en este almacén.'
const alreadyOpen = 'Ya hay una caja abierta en este almacén.'

async function setup() {
  const fx = await setupInventory()
  const open = (openingCents = 10_000) =>
    openCashSession(fx.clerkA, { warehouseId: fx.a.id, openingCents })
  return { fx, open }
}

describe('openCashSession', () => {
  test('opens a session with the opening cash and who opened it', async () => {
    const { fx, open } = await setup()
    const session = await open(10_000)
    expect(session).toMatchObject({
      warehouseId: fx.a.id,
      status: 'open',
      openingCents: 10_000,
      openedBy: fx.clerkA.userId,
    })
    const read = await getOpenCashSession(fx.clerkA, fx.a.id)
    expect(read?.session.id).toBe(session.id)
    expect(read?.expectedCents).toBe(10_000)
    expect(read?.movements).toEqual([])
  })

  test('a second open session in the same warehouse is refused, other warehouses are independent', async () => {
    const { fx, open } = await setup()
    await open()
    const before = await paymentState()
    const error = await errorOf(open)
    expect([error.code, error.message]).toEqual(['conflict', alreadyOpen])
    expect(await paymentState()).toEqual(before)
    const other = await openCashSession(fx.managerB, {
      warehouseId: fx.b.id,
      openingCents: 0,
    })
    expect(other.status).toBe('open')
  })

  test('two simultaneous opens leave exactly one session', async () => {
    const { fx } = await setup()
    const results = await Promise.allSettled([
      openCashSession(fx.clerkA, { warehouseId: fx.a.id, openingCents: 1 }),
      openCashSession(fx.managerA, { warehouseId: fx.a.id, openingCents: 2 }),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((r) => r.status === 'rejected')
    expect((rejected as PromiseRejectedResult).reason.message).toBe(alreadyOpen)
    expect((await paymentState()).sessions).toHaveLength(1)
  })

  test('needs warehouse.operate in that warehouse', async () => {
    const { fx } = await setup()
    const before = await paymentState()
    const error = await errorOf(() =>
      openCashSession(fx.managerB, { warehouseId: fx.a.id, openingCents: 0 }),
    )
    expect(error.code).toBe('forbidden')
    expect(await paymentState()).toEqual(before)
  })

  test('rejects a negative, fractional or oversized opening amount', async () => {
    const { fx } = await setup()
    const before = await paymentState()
    for (const openingCents of [-1, 1.5, 2147483648, Number.NaN]) {
      const error = await errorOf(() =>
        openCashSession(fx.clerkA, { warehouseId: fx.a.id, openingCents }),
      )
      expect([error.code, error.message]).toEqual([
        'invalid',
        'Revisa el monto: debe ser un número entero de centavos válido.',
      ])
    }
    expect(await paymentState()).toEqual(before)
  })
})

describe('cash entries and withdrawals', () => {
  test('record signed movements with their reason and move the expected cash', async () => {
    const { fx, open } = await setup()
    await open(10_000)
    await recordCashEntry(fx.clerkA, {
      warehouseId: fx.a.id,
      amountCents: 2_500,
      reason: 'Cambio del banco',
    })
    await recordCashWithdrawal(fx.clerkA, {
      warehouseId: fx.a.id,
      amountCents: 4_000,
      reason: 'Pago de flete',
    })
    const read = await getOpenCashSession(fx.clerkA, fx.a.id)
    expect(read?.expectedCents).toBe(8_500)
    expect(
      read?.movements.map((m) => [m.type, m.amountCents, m.reason]),
    ).toEqual([
      ['entry', 2_500, 'Cambio del banco'],
      ['withdrawal', -4_000, 'Pago de flete'],
    ])
  })

  test('require a reason, a positive amount and an open session', async () => {
    const { fx, open } = await setup()
    const input = { warehouseId: fx.a.id, amountCents: 100, reason: 'x' }
    const closed = await errorOf(() => recordCashEntry(fx.clerkA, input))
    expect([closed.code, closed.message]).toEqual(['conflict', noSession])
    await open()
    const before = await paymentState()
    for (const move of [recordCashEntry, recordCashWithdrawal]) {
      const blank = await errorOf(() =>
        move(fx.clerkA, { ...input, reason: '   ' }),
      )
      expect([blank.code, blank.message]).toEqual([
        'invalid',
        'Escribe el motivo del movimiento.',
      ])
      for (const amountCents of [0, -5, 1.5]) {
        const error = await errorOf(() =>
          move(fx.clerkA, { ...input, amountCents }),
        )
        expect(error.code).toBe('invalid')
      }
    }
    expect(await paymentState()).toEqual(before)
  })

  test('a withdrawal cannot take more cash than the drawer holds', async () => {
    const { fx, open } = await setup()
    await open(1_000)
    const before = await paymentState()
    const error = await errorOf(() =>
      recordCashWithdrawal(fx.clerkA, {
        warehouseId: fx.a.id,
        amountCents: 1_001,
        reason: 'Pago',
      }),
    )
    expect([error.code, error.message]).toEqual([
      'conflict',
      'No hay tanto efectivo en la caja.',
    ])
    expect(await paymentState()).toEqual(before)
  })

  test('staff of another warehouse cannot move cash', async () => {
    const { fx, open } = await setup()
    await open()
    const before = await paymentState()
    const error = await errorOf(() =>
      recordCashEntry(fx.managerB, {
        warehouseId: fx.a.id,
        amountCents: 100,
        reason: 'x',
      }),
    )
    expect(error.code).toBe('forbidden')
    expect(await paymentState()).toEqual(before)
  })
})

describe('closeCashSession', () => {
  test('stores expected and the (negative) difference, then a new session can open', async () => {
    const { fx, open } = await setup()
    await open(10_000)
    await recordCashEntry(fx.clerkA, {
      warehouseId: fx.a.id,
      amountCents: 500,
      reason: 'Entrada',
    })
    const closed = await closeCashSession(fx.clerkA, {
      warehouseId: fx.a.id,
      countedCents: 10_200,
    })
    expect(closed).toMatchObject({
      status: 'closed',
      expectedCents: 10_500,
      countedCents: 10_200,
      differenceCents: -300,
      closedBy: fx.clerkA.userId,
    })
    expect(closed.closedAt).toBeInstanceOf(Date)
    expect(await getOpenCashSession(fx.clerkA, fx.a.id)).toBeNull()
    expect((await open(0)).status).toBe('open')
  })

  test('a surplus is a positive difference; exact count is zero', async () => {
    const { fx, open } = await setup()
    await open(1_000)
    const over = await closeCashSession(fx.clerkA, {
      warehouseId: fx.a.id,
      countedCents: 1_250,
    })
    expect(over.differenceCents).toBe(250)
    await open(1_000)
    const exact = await closeCashSession(fx.clerkA, {
      warehouseId: fx.a.id,
      countedCents: 1_000,
    })
    expect(exact.differenceCents).toBe(0)
  })

  test('refuses a closed warehouse, an invalid count and no permission without changing anything', async () => {
    const { fx, open } = await setup()
    const none = await errorOf(() =>
      closeCashSession(fx.clerkA, { warehouseId: fx.a.id, countedCents: 0 }),
    )
    expect([none.code, none.message]).toEqual(['conflict', noSession])
    await open()
    const before = await paymentState()
    const bad = await errorOf(() =>
      closeCashSession(fx.clerkA, { warehouseId: fx.a.id, countedCents: -1 }),
    )
    expect(bad.code).toBe('invalid')
    const denied = await errorOf(() =>
      closeCashSession(fx.managerB, { warehouseId: fx.a.id, countedCents: 0 }),
    )
    expect(denied.code).toBe('forbidden')
    expect(await paymentState()).toEqual(before)
  })

  test('nothing can be recorded after the close', async () => {
    const { fx, open } = await setup()
    await open()
    await closeCashSession(fx.clerkA, { warehouseId: fx.a.id, countedCents: 0 })
    const error = await errorOf(() =>
      recordCashEntry(fx.clerkA, {
        warehouseId: fx.a.id,
        amountCents: 100,
        reason: 'x',
      }),
    )
    expect(error.message).toBe(noSession)
  })
})

describe('cash session reads', () => {
  test('owner and the warehouse manager see the history with movements; a clerk does not', async () => {
    const { fx, open } = await setup()
    await open(1_000)
    await recordCashEntry(fx.clerkA, {
      warehouseId: fx.a.id,
      amountCents: 100,
      reason: 'Entrada',
    })
    await closeCashSession(fx.clerkA, {
      warehouseId: fx.a.id,
      countedCents: 1_100,
    })
    await open(0)
    for (const actor of [fx.owner, fx.managerA]) {
      const history = await listCashSessions(actor, fx.a.id)
      expect(history).toHaveLength(2)
      expect(history[0].session.status).toBe('open')
      expect(history[1].movements).toHaveLength(1)
    }
    for (const actor of [fx.clerkA, fx.managerB]) {
      const error = await errorOf(() => listCashSessions(actor, fx.a.id))
      expect(error.code).toBe('forbidden')
    }
    const peek = await errorOf(() => getOpenCashSession(fx.managerB, fx.a.id))
    expect(peek.code).toBe('forbidden')
  })
})

describe('cash movements are append-only', () => {
  test('UPDATE, DELETE and TRUNCATE are refused by the database', async () => {
    const { fx, open } = await setup()
    await open()
    await recordCashEntry(fx.clerkA, {
      warehouseId: fx.a.id,
      amountCents: 100,
      reason: 'x',
    })
    const attempts = [
      async () => {
        await db.update(cashMovements).set({ reason: 'otro' })
      },
      async () => {
        await db.delete(cashMovements).where(eq(cashMovements.reason, 'x'))
      },
      async () => {
        await db.execute(sql`truncate table cash_movements`)
      },
    ]
    for (const attempt of attempts) await expect(attempt()).rejects.toThrow()
    expect((await paymentState()).cashMovements).toBe(1)
  })
})
