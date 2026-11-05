import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { getReceivables } from '#/modules/credit/server/receivables'
import { pickupOrder } from '#/modules/orders/services/order-actions'
import {
  closeCashSession,
  openCashSession,
} from '#/modules/cash/services/cash-sessions'
import { recordAbono } from '#/modules/credit/services/customer-ledger'
import {
  advance,
  equipWarehouseB,
  setupCredit,
  useClock,
} from '#/modules/credit/services/testing'
import { businessDate } from '#/modules/orders/services/clock'

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

  test('lists each credit order with the abonos applied oldest first, and the abono history', async () => {
    const fx = await setupCredit()
    const first = await fx.place(3)
    await pickupOrder(fx.clerkA, first.id, credit)
    const second = await fx.place(1)
    await pickupOrder(fx.clerkA, second.id, credit)
    const abono = await recordAbono(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      amountCents: 3500,
    })

    const view = await getReceivables(fx.clerkA)
    expect(view.today).toBe(businessDate())
    expect(
      view.charges.map(({ createdAt: _, dueOn, ...rest }) => ({
        ...rest,
        hasDueDate: typeof dueOn === 'string',
      })),
    ).toEqual([
      expect.objectContaining({
        customerId: fx.customer.id,
        customerName: 'Distribuidora Norte',
        orderId: first.id,
        warehouseName: 'Almacén A',
        amountCents: 3000,
        paidCents: 3000,
        balanceCents: 0,
        overdue: false,
        hasDueDate: true,
      }),
      expect.objectContaining({
        orderId: second.id,
        amountCents: 1000,
        paidCents: 500,
        balanceCents: 500,
        overdue: false,
      }),
    ])
    expect(view.abonos).toEqual([
      {
        id: abono.id,
        customerId: fx.customer.id,
        customerName: 'Distribuidora Norte',
        warehouseName: 'Almacén A',
        amountCents: 3500,
        createdAt: abono.createdAt,
      },
    ])
    // The per-customer row keeps reporting the same totals.
    expect(view.customers).toEqual([
      expect.objectContaining({ balanceCents: 500, overdueCents: 0 }),
    ])
  })

  test('a charge past its due day with a balance is overdue', async () => {
    const fx = await setupCredit()
    const order = await fx.place(2)
    await pickupOrder(fx.clerkA, order.id, credit)
    advance(24 * 9) // terms are 7 days

    const view = await getReceivables(fx.clerkA)
    expect(view.charges).toHaveLength(1)
    expect(view.charges[0]).toMatchObject({ balanceCents: 2000, overdue: true })
    expect(view.customers[0]).toMatchObject({ overdueCents: 2000 })
  })

  test('staff see "Otro almacén" for charges and abonos of a warehouse they are not assigned to', async () => {
    const fx = await setupCredit()
    await equipWarehouseB(fx)
    await openCashSession(fx.managerB, {
      warehouseId: fx.b.id,
      openingCents: 0,
    })
    const order = await fx.place(1, { warehouseId: fx.b.id })
    await pickupOrder(fx.managerB, order.id, credit)
    await recordAbono(fx.managerB, {
      warehouseId: fx.b.id,
      customerId: fx.customer.id,
      amountCents: 400,
    })

    const clerk = await getReceivables(fx.clerkA)
    expect(clerk.charges.map((row) => row.warehouseName)).toEqual([
      'Otro almacén',
    ])
    expect(clerk.abonos.map((row) => row.warehouseName)).toEqual([
      'Otro almacén',
    ])
    const owner = await getReceivables(fx.owner)
    expect(owner.charges[0]?.warehouseName).toBe('Almacén B')
  })

  test('without an operable warehouse there are no charges or abonos', async () => {
    const fx = await setupCredit()
    const order = await fx.place(1)
    await pickupOrder(fx.clerkA, order.id, credit)
    const outsider = { ...fx.clerkA, assignments: new Map() }
    const view = await getReceivables(outsider)
    expect(view.selectedId).toBeNull()
    expect(view.charges).toEqual([])
    expect(view.abonos).toEqual([])
  })

  test('an unknown warehouse id falls back to the first operable one', async () => {
    const fx = await setupCredit()
    const view = await getReceivables(fx.clerkA, 'no-existe')
    expect(view.selectedId).toBe(fx.a.id)
  })
})
