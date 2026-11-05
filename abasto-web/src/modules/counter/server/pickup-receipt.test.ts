import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { pickupWithReceipt } from '#/modules/counter/server/pickup-receipt'
import {
  errorOf,
  setupCredit,
  useClock,
} from '#/modules/credit/services/testing'
import {
  approveCreditAuthorization,
  listPendingCreditAuthorizations,
} from '#/modules/credit/services/credit-authorizations'
import { businessDate } from '#/modules/orders/services/clock'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

describe('pickupWithReceipt', () => {
  test('cash returns the receipt with change and no due date', async () => {
    const fx = await setupCredit()
    const order = await fx.place(3)
    const result = await pickupWithReceipt(fx.clerkA, {
      orderId: order.id,
      payment: { terms: 'contado', tenderedCents: 5000 },
    })
    expect(result.status).toBe('Recogido')
    expect(result.payment).toEqual({
      terms: 'contado',
      tenderedCents: 5000,
      changeCents: 2000,
    })
    expect(result.dueOn).toBeNull()
  })

  test('credit returns the due date: pickup day plus the customer terms', async () => {
    const fx = await setupCredit()
    const order = await fx.place(3)
    const result = await pickupWithReceipt(fx.clerkA, {
      orderId: order.id,
      payment: { terms: 'credito' },
    })
    expect(result.payment).toEqual({ terms: 'credito' })
    expect(result.dueOn).toBe(addDays(businessDate(), 7))
  })

  test('a refused credit pickup leaves the owner a pending request, then goes through once approved', async () => {
    const fx = await setupCredit()
    const order = await fx.place(6)
    const error = await errorOf(() =>
      pickupWithReceipt(fx.clerkA, {
        orderId: order.id,
        payment: { terms: 'credito' },
      }),
    )
    expect(error.code).toBe('conflict')
    const [pending] = await listPendingCreditAuthorizations(fx.owner)
    await approveCreditAuthorization(fx.owner, pending.id)
    const result = await pickupWithReceipt(fx.clerkA, {
      orderId: order.id,
      payment: { terms: 'credito' },
    })
    expect(result.status).toBe('Recogido')
    expect(result.dueOn).toBe(addDays(businessDate(), 7))
  })
})
