import { beforeEach, describe, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { cashMovements, cashSessions } from '#/modules/cash/db/schema'
import { recordCashEntry } from '#/modules/cash/services/cash-movements'
import {
  closeCashSession,
  getOpenCashSession,
  openCashSession,
} from '#/modules/cash/services/cash-sessions'
import { setupInventory } from '#/modules/inventory/services/testing'

beforeEach(() => resetDatabase(db))

async function setup() {
  const fx = await setupInventory()
  const session = await openCashSession(fx.staffA, {
    warehouseId: fx.a.id,
    openingCents: 1000,
  })
  return { fx, session }
}

const failure = async (run: () => Promise<unknown>) => {
  try {
    await run()
  } catch (error) {
    const e = error as { message: string; cause?: { message?: string } }
    return `${e.message} ${e.cause?.message ?? ''}`
  }
  return ''
}

const insertMovement = (
  sessionId: string,
  warehouseId: string,
  actorId: string,
) =>
  db.execute(sql`
    insert into cash_movements (session_id, warehouse_id, type, amount_cents, reason, actor_id)
    values (${sessionId}, ${warehouseId}, 'entry', 500, 'x', ${actorId})`)

describe('closed cash sessions are immutable', () => {
  test('a closed session refuses UPDATE and DELETE, an open one can still close', async () => {
    const { fx, session } = await setup()
    const closed = await closeCashSession(fx.staffA, {
      warehouseId: fx.a.id,
      countedCents: 1000,
    })
    expect(closed.status).toBe('closed')
    expect(
      await failure(() =>
        db.execute(
          sql`update cash_sessions set counted_cents = 5 where id = ${session.id}`,
        ),
      ),
    ).toContain('closed')
    expect(
      await failure(() =>
        db.execute(sql`delete from cash_sessions where id = ${session.id}`),
      ),
    ).toContain('closed')
    const [row] = await db.select().from(cashSessions)
    expect(row.countedCents).toBe(1000)
  })

  test('an open session can be updated and deleted-free flows keep working', async () => {
    const { fx } = await setup()
    await recordCashEntry(fx.staffA, {
      warehouseId: fx.a.id,
      amountCents: 500,
      reason: 'cambio',
    })
    await closeCashSession(fx.staffA, {
      warehouseId: fx.a.id,
      countedCents: 1500,
    })
    const reopened = await openCashSession(fx.staffA, {
      warehouseId: fx.a.id,
      openingCents: 0,
    })
    expect(reopened.status).toBe('open')
  })
})

describe('cash movements need an open session of the same warehouse', () => {
  test('inserting into a closed session is refused', async () => {
    const { fx, session } = await setup()
    await closeCashSession(fx.staffA, {
      warehouseId: fx.a.id,
      countedCents: 1000,
    })
    expect(
      await failure(() =>
        insertMovement(session.id, fx.a.id, fx.staffA.userId),
      ),
    ).toContain('open')
    expect(await db.select().from(cashMovements)).toHaveLength(0)
  })

  test('inserting with another warehouse than the session is refused', async () => {
    const { fx, session } = await setup()
    expect(
      await failure(() =>
        insertMovement(session.id, fx.b.id, fx.staffA.userId),
      ),
    ).toContain('warehouse')
    expect(await db.select().from(cashMovements)).toHaveLength(0)
  })

  test('an open session of the same warehouse accepts movements', async () => {
    const { fx, session } = await setup()
    await insertMovement(session.id, fx.a.id, fx.staffA.userId)
    expect(await db.select().from(cashMovements)).toHaveLength(1)
  })
})

describe('expected cash', () => {
  test('sums as bigint beyond the int4 range', async () => {
    const { fx } = await setup()
    for (let i = 0; i < 2; i++) {
      await recordCashEntry(fx.staffA, {
        warehouseId: fx.a.id,
        amountCents: 2_000_000_000,
        reason: 'grande',
      })
    }
    const open = await getOpenCashSession(fx.staffA, fx.a.id)
    expect(open?.expectedCents).toBe(4_000_001_000)
  })
})
