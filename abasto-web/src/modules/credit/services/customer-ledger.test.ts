import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { cashMovements } from '#/modules/cash/db/schema'
import {
  closeCashSession,
  getOpenCashSession,
  openCashSession,
} from '#/modules/cash/services/cash-sessions'
import { customerLedger } from '#/modules/credit/db/schema'
import { overdueOf } from '#/modules/credit/services/credit-balance'
import {
  getCustomerBalance,
  getCustomerStatement,
  recordAbono,
} from '#/modules/credit/services/customer-ledger'
import {
  equipWarehouseB,
  errorOf,
  paymentState,
  setupCredit,
  useClock,
} from '#/modules/credit/services/testing'
import { pickupOrder } from '#/modules/orders/services/order-actions'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const credit = { terms: 'credito' as const }
const tooMuch = 'El abono no puede ser mayor que el saldo del cliente.'

async function indebted(amount = 3) {
  const fx = await setupCredit()
  await pickupOrder(fx.clerkA, (await fx.place(amount)).id, credit)
  return fx
}

describe('overdueOf (oldest charges are covered first)', () => {
  const charge = (amountCents: number, dueOn: string) => ({
    type: 'charge' as const,
    amountCents,
    dueOn,
  })
  const abono = (amountCents: number) => ({
    type: 'abono' as const,
    amountCents,
    dueOn: null,
  })
  const today = '2026-11-10'

  test('a past-due charge is overdue until fully covered', () => {
    const entries = [charge(1000, '2026-11-09'), charge(2000, '2026-12-01')]
    expect(overdueOf(entries, today)).toBe(1000)
    expect(overdueOf([...entries, abono(500)], today)).toBe(500)
    expect(overdueOf([...entries, abono(1000)], today)).toBe(0)
  })

  test('abonos spill to the next charge in order', () => {
    const entries = [charge(1000, '2026-11-01'), charge(2000, '2026-11-05')]
    expect(overdueOf([...entries, abono(1500)], today)).toBe(1500)
    expect(overdueOf([...entries, abono(3000)], today)).toBe(0)
  })

  test('paying a later charge does not cover an earlier one, and due today is not overdue', () => {
    const entries = [charge(1000, '2026-11-09'), charge(2000, '2026-11-10')]
    expect(overdueOf(entries, today)).toBe(1000)
    expect(overdueOf([charge(500, today)], today)).toBe(0)
    expect(overdueOf([], today)).toBe(0)
  })
})

describe('recordAbono', () => {
  test('cash received at another warehouse reduces the single company-wide balance', async () => {
    const fx = await indebted(3)
    await equipWarehouseB(fx)
    await openCashSession(fx.managerB, {
      warehouseId: fx.b.id,
      openingCents: 500,
    })
    const entry = await recordAbono(fx.managerB, {
      warehouseId: fx.b.id,
      customerId: fx.customer.id,
      amountCents: 1200,
    })
    expect(entry).toMatchObject({
      type: 'abono',
      amountCents: 1200,
      warehouseId: fx.b.id,
    })
    expect(await getCustomerBalance(fx.managerB, fx.customer.id)).toMatchObject(
      {
        balanceCents: 1800,
      },
    )
    const drawer = await getOpenCashSession(fx.managerB, fx.b.id)
    expect(drawer?.expectedCents).toBe(1700)
    expect(drawer?.movements[0]).toMatchObject({
      type: 'abono',
      amountCents: 1200,
      customerId: fx.customer.id,
    })
    const closed = await closeCashSession(fx.managerB, {
      warehouseId: fx.b.id,
      countedCents: 1700,
    })
    expect(closed).toMatchObject({ expectedCents: 1700, differenceCents: 0 })
    // The drawer of A is untouched.
    expect((await getOpenCashSession(fx.clerkA, fx.a.id))?.expectedCents).toBe(
      0,
    )
  })

  test('the full balance can be paid; the next abono is refused', async () => {
    const fx = await indebted(3)
    await recordAbono(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      amountCents: 3000,
    })
    expect(await getCustomerBalance(fx.clerkA, fx.customer.id)).toMatchObject({
      balanceCents: 0,
    })
    const error = await errorOf(() =>
      recordAbono(fx.clerkA, {
        warehouseId: fx.a.id,
        customerId: fx.customer.id,
        amountCents: 1,
      }),
    )
    expect([error.code, error.message]).toEqual(['conflict', tooMuch])
  })

  test('an abono above the balance, zero, negative or fractional is refused and changes nothing', async () => {
    const fx = await indebted(3)
    const before = await paymentState()
    const over = await errorOf(() =>
      recordAbono(fx.clerkA, {
        warehouseId: fx.a.id,
        customerId: fx.customer.id,
        amountCents: 3001,
      }),
    )
    expect([over.code, over.message]).toEqual(['conflict', tooMuch])
    for (const amountCents of [0, -100, 10.5, 2 ** 40]) {
      const error = await errorOf(() =>
        recordAbono(fx.clerkA, {
          warehouseId: fx.a.id,
          customerId: fx.customer.id,
          amountCents,
        }),
      )
      expect(error.code).toBe('invalid')
    }
    expect(await paymentState()).toEqual(before)
  })

  test('needs an open session and operate permission in the receiving warehouse', async () => {
    const fx = await indebted(3)
    await equipWarehouseB(fx)
    const before = await paymentState()
    const closed = await errorOf(() =>
      recordAbono(fx.managerB, {
        warehouseId: fx.b.id,
        customerId: fx.customer.id,
        amountCents: 100,
      }),
    )
    expect([closed.code, closed.message]).toEqual([
      'conflict',
      'Abre la caja antes de cobrar.',
    ])
    await openCashSession(fx.managerB, {
      warehouseId: fx.b.id,
      openingCents: 0,
    })
    const denied = await errorOf(() =>
      recordAbono(fx.clerkA, {
        warehouseId: fx.b.id,
        customerId: fx.customer.id,
        amountCents: 100,
      }),
    )
    expect(denied.code).toBe('forbidden')
    const unknown = await errorOf(() =>
      recordAbono(fx.managerB, {
        warehouseId: fx.b.id,
        customerId: '00000000-0000-4000-8000-000000000000',
        amountCents: 100,
      }),
    )
    expect(unknown.code).toBe('not_found')
    expect((await paymentState()).ledger).toBe(before.ledger)
    expect((await paymentState()).cashMovements).toBe(before.cashMovements)
  })
})

describe('customer balance reads', () => {
  test('statement lists charges and abonos oldest first with the running balance', async () => {
    const fx = await indebted(3)
    await recordAbono(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      amountCents: 1000,
    })
    const statement = await getCustomerStatement(fx.clerkA, fx.customer.id)
    expect(statement.balanceCents).toBe(2000)
    expect(
      statement.entries.map((e) => [e.type, e.amountCents, e.balanceCents]),
    ).toEqual([
      ['charge', 3000, 3000],
      ['abono', 1000, 2000],
    ])
  })

  test('staff without any assignment cannot read balances', async () => {
    const fx = await indebted(1)
    const nobody = {
      userId: 'x',
      role: 'staff' as const,
      assignments: new Map(),
    }
    expect(
      (await errorOf(() => getCustomerBalance(nobody, fx.customer.id))).code,
    ).toBe('forbidden')
    expect(
      (await errorOf(() => getCustomerStatement(nobody, fx.customer.id))).code,
    ).toBe('forbidden')
  })
})

describe('customer ledger is append-only', () => {
  test('UPDATE, DELETE and TRUNCATE are refused by the database', async () => {
    const fx = await indebted(1)
    const attempts = [
      async () => {
        await db.update(customerLedger).set({ amountCents: 1 })
      },
      async () => {
        await db
          .delete(customerLedger)
          .where(eq(customerLedger.customerId, fx.customer.id))
      },
      async () => {
        await db.execute(sql`truncate table customer_ledger`)
      },
    ]
    for (const attempt of attempts) await expect(attempt()).rejects.toThrow()
    expect((await paymentState()).ledger).toBe(1)
    expect(await db.select().from(cashMovements)).toHaveLength(0)
  })
})
