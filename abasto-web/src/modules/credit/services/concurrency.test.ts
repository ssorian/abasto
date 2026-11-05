import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { openCashSession } from '#/modules/cash/services/cash-sessions'
import { customerLedger } from '#/modules/credit/db/schema'
import {
  getCustomerBalance,
  recordAbono,
} from '#/modules/credit/services/customer-ledger'
import {
  equipWarehouseB,
  paymentState,
  receive,
  setupCredit,
} from '#/modules/credit/services/testing'
import { cashMovements } from '#/modules/cash/db/schema'
import { setCustomerCredit } from '#/modules/customers/services/customers'
import { pickupOrder } from '#/modules/orders/services/order-actions'

beforeEach(() => resetDatabase(db))

const credit = { terms: 'credito' as const }
const settled = (results: Array<PromiseSettledResult<unknown>>) =>
  results.filter((r) => r.status === 'fulfilled').length

describe('payment concurrency', () => {
  test('simultaneous credit pickups in two warehouses cannot overspend the limit', async () => {
    const fx = await setupCredit()
    await equipWarehouseB(fx)
    const a = await fx.place(3) // 3000 each, limit 5000
    const b = await fx.place(3, { warehouseId: fx.b.id })
    const results = await Promise.allSettled([
      pickupOrder(fx.clerkA, a.id, credit),
      pickupOrder(fx.managerB, b.id, credit),
    ])
    expect(settled(results)).toBe(1)
    const state = await paymentState()
    expect(state.ledger).toBe(1)
    expect(state.authorizations).toHaveLength(1)
    expect(state.authorizations[0].status).toBe('pending')
    expect(
      (await getCustomerBalance(fx.owner, fx.customer.id)).balanceCents,
    ).toBe(3000)
  })

  test('the same order picked up twice at once posts one charge', async () => {
    const fx = await setupCredit()
    const order = await fx.place(2)
    const results = await Promise.allSettled([
      pickupOrder(fx.clerkA, order.id, credit),
      pickupOrder(fx.managerA, order.id, credit),
    ])
    expect(settled(results)).toBe(1)
    expect((await paymentState()).ledger).toBe(1)
  })

  test('the same order paid in cash twice at once records one sale', async () => {
    const fx = await setupCredit()
    const order = await fx.place(2)
    const pay = { terms: 'contado' as const, tenderedCents: 2000 }
    const results = await Promise.allSettled([
      pickupOrder(fx.clerkA, order.id, pay),
      pickupOrder(fx.managerA, order.id, pay),
    ])
    expect(settled(results)).toBe(1)
    expect(await db.select().from(cashMovements)).toHaveLength(1)
  })

  test('simultaneous abonos cannot pay more than the balance', async () => {
    const fx = await setupCredit()
    await equipWarehouseB(fx)
    await openCashSession(fx.managerB, {
      warehouseId: fx.b.id,
      openingCents: 0,
    })
    await pickupOrder(fx.clerkA, (await fx.place(3)).id, credit)
    const results = await Promise.allSettled([
      recordAbono(fx.clerkA, {
        warehouseId: fx.a.id,
        customerId: fx.customer.id,
        amountCents: 2000,
      }),
      recordAbono(fx.managerB, {
        warehouseId: fx.b.id,
        customerId: fx.customer.id,
        amountCents: 2000,
      }),
    ])
    expect(settled(results)).toBe(1)
    expect(
      (await getCustomerBalance(fx.owner, fx.customer.id)).balanceCents,
    ).toBe(1000)
    expect(await db.select().from(customerLedger)).toHaveLength(2)
  })

  test('a pickup and an abono racing keep the balance consistent', async () => {
    const fx = await setupCredit()
    await equipWarehouseB(fx)
    await openCashSession(fx.managerB, {
      warehouseId: fx.b.id,
      openingCents: 0,
    })
    await pickupOrder(fx.clerkA, (await fx.place(4)).id, credit) // 4000
    const next = await fx.place(2, { warehouseId: fx.b.id }) // would be 6000 > 5000
    const results = await Promise.allSettled([
      recordAbono(fx.managerB, {
        warehouseId: fx.b.id,
        customerId: fx.customer.id,
        amountCents: 4000,
      }),
      pickupOrder(fx.managerB, next.id, credit),
    ])
    const { balanceCents } = await getCustomerBalance(fx.owner, fx.customer.id)
    expect(balanceCents).toBeLessThanOrEqual(5000)
    expect(settled(results)).toBeGreaterThanOrEqual(1)
  })

  test('an abono and a cash pickup of the same customer in one warehouse never deadlock', async () => {
    const fx = await setupCredit()
    await setCustomerCredit(fx.owner, fx.customer.id, {
      enabled: true,
      limitCents: 1_000_000,
      termsDays: 7,
    })
    await pickupOrder(fx.clerkA, (await fx.place(30)).id, credit)
    await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
    const rounds = 30
    const orders = []
    for (let i = 0; i < rounds * 3; i++) orders.push(await fx.place(1))
    const pay = { terms: 'contado' as const, tenderedCents: 1000 }
    const abono = () =>
      recordAbono(fx.clerkA, {
        warehouseId: fx.a.id,
        customerId: fx.customer.id,
        amountCents: 100,
      })
    for (let round = 0; round < rounds; round++) {
      const batch = orders.slice(round * 3, round * 3 + 3)
      const results = await Promise.allSettled([
        abono(),
        abono(),
        ...batch.map((order) => pickupOrder(fx.managerA, order.id, pay)),
      ])
      const failures = results.flatMap((r) =>
        r.status === 'rejected'
          ? [String(r.reason?.cause?.code ?? r.reason)]
          : [],
      )
      expect(failures).toEqual([])
    }
  })
})
