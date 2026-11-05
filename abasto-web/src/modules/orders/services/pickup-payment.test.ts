import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { cashMovements, cashSessions } from '#/modules/cash/db/schema'
import {
  closeCashSession,
  getOpenCashSession,
} from '#/modules/cash/services/cash-sessions'
import {
  creditAuthorizations,
  customerLedger,
} from '#/modules/credit/db/schema'
import {
  approveCreditAuthorization,
  listPendingCreditAuthorizations,
  rejectCreditAuthorization,
} from '#/modules/credit/services/credit-authorizations'
import {
  getCustomerBalance,
  recordAbono,
} from '#/modules/credit/services/customer-ledger'
import {
  advance,
  errorOf,
  paymentState,
  setupCredit,
  useClock,
} from '#/modules/credit/services/testing'
import { orders } from '#/modules/orders/db/schema'
import { businessDate } from '#/modules/orders/services/clock'
import { setCustomerCredit } from '#/modules/customers/services/customers'
import { pickupOrder } from '#/modules/orders/services/order-actions'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const choose = 'Elige cómo se paga el pedido.'
const noDrawer = 'Abre la caja antes de cobrar.'
const short = 'El efectivo recibido no cubre el total del pedido.'
const needsOwner =
  'Este pedido supera el límite de crédito o el cliente tiene saldo vencido. Pídele al dueño que lo autorice y vuelve a intentar.'
const waiting =
  'Este pedido espera la autorización del dueño. Pídele que la apruebe y vuelve a intentar.'
const rejected = 'El dueño no autorizó el crédito de este pedido.'
const credit = { terms: 'credito' as const }
const cash = (tenderedCents: number) => ({
  terms: 'contado' as const,
  tenderedCents,
})

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

describe('pickup paid in cash (contado)', () => {
  test('exact payment records a cash sale in the open session', async () => {
    const fx = await setupCredit()
    const order = await fx.place(3)
    const picked = await pickupOrder(fx.clerkA, order.id, cash(3000))
    expect(picked.status).toBe('Recogido')
    expect(picked.payment).toEqual({
      terms: 'contado',
      tenderedCents: 3000,
      changeCents: 0,
    })
    const [sale] = await db.select().from(cashMovements)
    expect(sale).toMatchObject({
      type: 'sale',
      amountCents: 3000,
      tenderedCents: 3000,
      changeCents: 0,
      orderId: order.id,
      actorId: fx.clerkA.userId,
    })
    expect((await getOpenCashSession(fx.clerkA, fx.a.id))?.expectedCents).toBe(
      3000,
    )
  })

  test('more cash than the total gives change, and only the total stays in the drawer', async () => {
    const fx = await setupCredit()
    const order = await fx.place(3)
    const picked = await pickupOrder(fx.clerkA, order.id, cash(5000))
    expect(picked.payment).toMatchObject({ changeCents: 2000 })
    const [sale] = await db.select().from(cashMovements)
    expect([sale.amountCents, sale.tenderedCents, sale.changeCents]).toEqual([
      3000, 5000, 2000,
    ])
  })

  test('insufficient cash refuses the pickup and changes nothing', async () => {
    const fx = await setupCredit()
    const order = await fx.place(3)
    const before = await paymentState()
    const error = await errorOf(() =>
      pickupOrder(fx.clerkA, order.id, cash(2999)),
    )
    expect([error.code, error.message]).toEqual(['conflict', short])
    expect(await paymentState()).toEqual(before)
  })

  test('without an open session the pickup is refused and changes nothing', async () => {
    const fx = await setupCredit()
    await closeCashSession(fx.clerkA, { warehouseId: fx.a.id, countedCents: 0 })
    const order = await fx.place(3)
    const before = await paymentState()
    const error = await errorOf(() =>
      pickupOrder(fx.clerkA, order.id, cash(3000)),
    )
    expect([error.code, error.message]).toEqual(['conflict', noDrawer])
    expect(await paymentState()).toEqual(before)
  })

  test('a missing or malformed payment is refused and changes nothing', async () => {
    const fx = await setupCredit()
    const order = await fx.place(3)
    const before = await paymentState()
    const none = await errorOf(() =>
      pickupOrder(fx.clerkA, order.id, undefined),
    )
    expect([none.code, none.message]).toEqual(['invalid', choose])
    for (const bad of [
      cash(Number.NaN),
      cash(-1),
      cash(3000.5),
      cash(2 ** 40),
    ]) {
      const error = await errorOf(() => pickupOrder(fx.clerkA, order.id, bad))
      expect(error.code).toBe('invalid')
    }
    expect(
      (
        await errorOf(() =>
          pickupOrder(fx.clerkA, order.id, { terms: 'x' } as never),
        )
      ).message,
    ).toBe(choose)
    expect(await paymentState()).toEqual(before)
  })
})

describe('pickup on credit (crédito)', () => {
  test('within the limit posts a charge due on the pickup date plus the terms', async () => {
    const fx = await setupCredit()
    const order = await fx.place(3)
    const picked = await pickupOrder(fx.clerkA, order.id, credit)
    expect(picked.status).toBe('Recogido')
    expect(picked.payment).toEqual({ terms: 'credito' })
    const [charge] = await db.select().from(customerLedger)
    expect(charge).toMatchObject({
      type: 'charge',
      amountCents: 3000,
      orderId: order.id,
      dueOn: addDays(businessDate(), 7),
      warehouseId: fx.a.id,
    })
    expect(await db.select().from(cashMovements)).toHaveLength(0)
    expect(await db.select().from(creditAuthorizations)).toHaveLength(0)
    expect(await getCustomerBalance(fx.clerkA, fx.customer.id)).toMatchObject({
      balanceCents: 3000,
      overdueCents: 0,
    })
  })

  test('exactly at the limit is allowed', async () => {
    const fx = await setupCredit()
    const picked = await pickupOrder(fx.clerkA, (await fx.place(5)).id, credit)
    expect(picked.status).toBe('Recogido')
  })

  test('a customer without credit enabled is refused and changes nothing', async () => {
    const fx = await setupCredit()
    await setCustomerCredit(fx.owner, fx.customer.id, {
      enabled: false,
      limitCents: 5000,
      termsDays: 7,
    })
    const order = await fx.place(1)
    const before = await paymentState()
    const error = await errorOf(() => pickupOrder(fx.clerkA, order.id, credit))
    expect([error.code, error.message]).toEqual([
      'conflict',
      'Este cliente no tiene crédito habilitado.',
    ])
    expect(await paymentState()).toEqual(before)
  })

  test('over the limit: pickup refused, pending authorization created once; owner approval lets it through', async () => {
    const fx = await setupCredit()
    await pickupOrder(fx.clerkA, (await fx.place(3)).id, credit)
    const order = await fx.place(3) // 3000 + 3000 > 5000
    const before = await paymentState()
    for (let i = 0; i < 2; i++) {
      const error = await errorOf(() =>
        pickupOrder(fx.clerkA, order.id, credit),
      )
      expect([error.code, error.message]).toEqual([
        'conflict',
        i === 0 ? needsOwner : waiting,
      ])
    }
    const after = await paymentState()
    expect(after.orders).toEqual(before.orders)
    expect(after.lots).toEqual(before.lots)
    expect(after.ledger).toBe(before.ledger)
    expect(after.authorizations).toHaveLength(1)
    expect(after.authorizations[0]).toMatchObject({
      orderId: order.id,
      customerId: fx.customer.id,
      amountCents: 3000,
      status: 'pending',
      decidedBy: null,
    })
    const pending = await listPendingCreditAuthorizations(fx.owner)
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({
      orderId: order.id,
      amountCents: 3000,
      customerName: 'Distribuidora Norte',
      warehouseId: fx.a.id,
    })

    const approved = await approveCreditAuthorization(fx.owner, pending[0].id)
    expect(approved).toMatchObject({
      status: 'approved',
      decidedBy: fx.owner.userId,
    })
    expect(approved.decidedAt).toBeInstanceOf(Date)
    expect(await listPendingCreditAuthorizations(fx.owner)).toHaveLength(0)

    const picked = await pickupOrder(fx.clerkA, order.id, credit)
    expect(picked.status).toBe('Recogido')
    expect(await getCustomerBalance(fx.clerkA, fx.customer.id)).toMatchObject({
      balanceCents: 6000,
    })
    const [used] = await db.select().from(creditAuthorizations)
    expect(used.usedAt).toBeInstanceOf(Date)
  })

  test('a rejection keeps the credit pickup refused and creates nothing new', async () => {
    const fx = await setupCredit()
    const order = await fx.place(6) // 6000 > 5000
    await errorOf(() => pickupOrder(fx.clerkA, order.id, credit))
    const [auth] = await listPendingCreditAuthorizations(fx.owner)
    const done = await rejectCreditAuthorization(fx.owner, auth.id)
    expect(done).toMatchObject({
      status: 'rejected',
      decidedBy: fx.owner.userId,
    })
    const before = await paymentState()
    const error = await errorOf(() => pickupOrder(fx.clerkA, order.id, credit))
    expect([error.code, error.message]).toEqual(['conflict', rejected])
    expect(await paymentState()).toEqual(before)
    // The order can still be paid in cash.
    expect((await pickupOrder(fx.clerkA, order.id, cash(6000))).status).toBe(
      'Recogido',
    )
  })

  test('an overdue charge blocks credit even within the limit, until paid', async () => {
    const fx = await setupCredit()
    const first = await fx.place(1)
    await pickupOrder(fx.clerkA, first.id, credit) // due in 7 days
    advance(8 * 24)
    const order = await fx.place(1)
    expect(await getCustomerBalance(fx.clerkA, fx.customer.id)).toMatchObject({
      balanceCents: 1000,
      overdueCents: 1000,
    })
    const before = await paymentState()
    const error = await errorOf(() => pickupOrder(fx.clerkA, order.id, credit))
    expect([error.code, error.message]).toEqual(['conflict', needsOwner])
    expect((await paymentState()).authorizations).toHaveLength(1)
    expect((await paymentState()).orders).toEqual(before.orders)

    await recordAbono(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      amountCents: 1000,
    })
    const picked = await pickupOrder(fx.clerkA, order.id, credit)
    expect(picked.status).toBe('Recogido')
  })

  test('an authorization is bound to its amount: another amount needs a new one', async () => {
    const fx = await setupCredit()
    const order = await fx.place(6)
    await errorOf(() => pickupOrder(fx.clerkA, order.id, credit))
    const [auth] = await listPendingCreditAuthorizations(fx.owner)
    await approveCreditAuthorization(fx.owner, auth.id)
    await db
      .update(orders)
      .set({ totalCents: 7000 })
      .where(eq(orders.id, order.id))
    const error = await errorOf(() => pickupOrder(fx.clerkA, order.id, credit))
    expect([error.code, error.message]).toEqual(['conflict', needsOwner])
    const all = await db.select().from(creditAuthorizations)
    expect(all.map((a) => [a.amountCents, a.status]).sort()).toEqual([
      [6000, 'approved'],
      [7000, 'pending'],
    ])
    expect(await db.select().from(customerLedger)).toHaveLength(0)
  })

  test('only the owner can authorize, reject or list pending authorizations', async () => {
    const fx = await setupCredit()
    const order = await fx.place(6)
    await errorOf(() => pickupOrder(fx.clerkA, order.id, credit))
    const [auth] = await listPendingCreditAuthorizations(fx.owner)
    const before = await paymentState()
    for (const actor of [fx.clerkA, fx.managerA]) {
      for (const act of [
        () => approveCreditAuthorization(actor, auth.id),
        () => rejectCreditAuthorization(actor, auth.id),
        () => listPendingCreditAuthorizations(actor),
      ]) {
        expect((await errorOf(act)).code).toBe('forbidden')
      }
    }
    expect(await paymentState()).toEqual(before)
  })

  test('a decided authorization cannot be decided again; unknown ids are not found', async () => {
    const fx = await setupCredit()
    const order = await fx.place(6)
    await errorOf(() => pickupOrder(fx.clerkA, order.id, credit))
    const [auth] = await listPendingCreditAuthorizations(fx.owner)
    await rejectCreditAuthorization(fx.owner, auth.id)
    const again = await errorOf(() =>
      approveCreditAuthorization(fx.owner, auth.id),
    )
    expect([again.code, again.message]).toEqual([
      'conflict',
      'Esa autorización ya fue resuelta.',
    ])
    const missing = await errorOf(() =>
      approveCreditAuthorization(
        fx.owner,
        '00000000-0000-4000-8000-000000000000',
      ),
    )
    expect(missing.code).toBe('not_found')
  })

  test('a charge does not need the cash drawer', async () => {
    const fx = await setupCredit()
    await closeCashSession(fx.clerkA, { warehouseId: fx.a.id, countedCents: 0 })
    const picked = await pickupOrder(fx.clerkA, (await fx.place(1)).id, credit)
    expect(picked.status).toBe('Recogido')
    expect(await db.select().from(cashSessions)).toHaveLength(1)
  })
})
