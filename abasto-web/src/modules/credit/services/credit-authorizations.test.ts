import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { creditAuthorizations } from '#/modules/credit/db/schema'
import {
  approveCreditAuthorization,
  listPendingCreditAuthorizations,
  rejectCreditAuthorization,
} from '#/modules/credit/services/credit-authorizations'
import {
  errorOf,
  paymentState,
  setupCredit,
} from '#/modules/credit/services/testing'
import {
  cancelOrder,
  pickupOrder,
} from '#/modules/orders/services/order-actions'

beforeEach(() => resetDatabase(db))

const notOpen = 'El pedido de esta autorización ya no está abierto.'

/** A credit pickup over the limit leaves a pending authorization. */
async function pending() {
  const fx = await setupCredit()
  const order = await fx.place(6) // 6000 > 5000 limit
  await errorOf(() => pickupOrder(fx.clerkA, order.id, { terms: 'credito' }))
  const [authorization] = await listPendingCreditAuthorizations(fx.owner)
  return { fx, order, authorization }
}

describe('deciding an authorization', () => {
  for (const [name, decide] of [
    ['approve', approveCreditAuthorization],
    ['reject', rejectCreditAuthorization],
  ] as const) {
    test(`${name} is refused once the order was cancelled, leaving it pending`, async () => {
      const { fx, order, authorization } = await pending()
      await cancelOrder(fx.clerkA, order.id)
      const before = await paymentState()
      const error = await errorOf(() => decide(fx.owner, authorization.id))
      expect([error.code, error.message]).toEqual(['conflict', notOpen])
      expect(await paymentState()).toEqual(before)
      const [row] = await db.select().from(creditAuthorizations)
      expect(row.status).toBe('pending')
    })
  }

  test('an open order can still be approved', async () => {
    const { fx, authorization } = await pending()
    const decided = await approveCreditAuthorization(fx.owner, authorization.id)
    expect(decided.status).toBe('approved')
  })
})
