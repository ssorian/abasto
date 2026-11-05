import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { getReceivables } from '#/modules/credit/server/receivables'
import { pickupOrder } from '#/modules/orders/services/order-actions'
import { closeCashSession } from '#/modules/cash/services/cash-sessions'
import { setupCredit, useClock } from '#/modules/credit/services/testing'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const credit = { terms: 'credito' as const }

describe('getReceivables', () => {
  test('lists customers with a balance and tells whether the drawer is open', async () => {
    const fx = await setupCredit()
    const order = await fx.place(3)
    await pickupOrder(fx.clerkA, order.id, credit)

    const view = await getReceivables(fx.clerkA)
    expect(view.selectedId).toBe(fx.a.id)
    expect(view.drawerOpen).toBe(true)
    expect(view.customers).toEqual([
      {
        customerId: fx.customer.id,
        name: 'Distribuidora Norte',
        balanceCents: 3000,
        overdueCents: 0,
        creditLimitCents: 5000,
        termsDays: 7,
      },
    ])

    await closeCashSession(fx.clerkA, { warehouseId: fx.a.id, countedCents: 0 })
    expect((await getReceivables(fx.clerkA)).drawerOpen).toBe(false)
  })

  test('customers without a balance are not listed', async () => {
    const fx = await setupCredit()
    expect((await getReceivables(fx.clerkA)).customers).toEqual([])
  })

  test('staff never get the pending requests; the owner does, with the warehouse name', async () => {
    const fx = await setupCredit()
    const order = await fx.place(6) // 6000 > 5000 limit
    await pickupOrder(fx.clerkA, order.id, credit).catch(() => undefined)

    const staff = await getReceivables(fx.clerkA)
    expect(staff.canAuthorize).toBe(false)
    expect(staff.pending).toEqual([])

    const owner = await getReceivables(fx.owner)
    expect(owner.canAuthorize).toBe(true)
    expect(owner.pending).toHaveLength(1)
    expect(owner.pending[0]).toMatchObject({
      orderId: order.id,
      customerName: 'Distribuidora Norte',
      amountCents: 6000,
      warehouseName: 'Almacén A',
    })
  })

  test('an unknown warehouse id falls back to the first operable one', async () => {
    const fx = await setupCredit()
    const view = await getReceivables(fx.clerkA, 'no-existe')
    expect(view.selectedId).toBe(fx.a.id)
  })
})
