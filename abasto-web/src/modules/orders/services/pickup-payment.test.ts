import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { cashMovements } from '#/modules/cash/db/schema'
import {
  closeCashSession,
  getOpenCashSession,
} from '#/modules/cash/services/cash-sessions'
import {
  errorOf,
  paymentState,
  setupSales,
  useClock,
} from '#/modules/cash/services/testing'
import { pickupOrder } from '#/modules/orders/services/order-actions'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const choose = 'Elige cómo se paga el pedido.'
const noDrawer = 'Abre la caja antes de cobrar.'
const short = 'El efectivo recibido no cubre el total del pedido.'
const cash = (tenderedCents: number) => ({
  terms: 'contado' as const,
  tenderedCents,
})

describe('pickup paid in cash (contado)', () => {
  test('exact payment records a cash sale in the open session', async () => {
    const fx = await setupSales()
    const order = await fx.place(3)
    const picked = await pickupOrder(fx.staffA, order.id, cash(3000))
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
      actorId: fx.staffA.userId,
    })
    expect((await getOpenCashSession(fx.staffA, fx.a.id))?.expectedCents).toBe(
      3000,
    )
  })

  test('more cash than the total gives change, and only the total stays in the drawer', async () => {
    const fx = await setupSales()
    const order = await fx.place(3)
    const picked = await pickupOrder(fx.staffA, order.id, cash(5000))
    expect(picked.payment).toMatchObject({ changeCents: 2000 })
    const [sale] = await db.select().from(cashMovements)
    expect([sale.amountCents, sale.tenderedCents, sale.changeCents]).toEqual([
      3000, 5000, 2000,
    ])
  })

  test('insufficient cash refuses the pickup and changes nothing', async () => {
    const fx = await setupSales()
    const order = await fx.place(3)
    const before = await paymentState()
    const error = await errorOf(() =>
      pickupOrder(fx.staffA, order.id, cash(2999)),
    )
    expect([error.code, error.message]).toEqual(['conflict', short])
    expect(await paymentState()).toEqual(before)
  })

  test('without an open session the pickup is refused and changes nothing', async () => {
    const fx = await setupSales()
    await closeCashSession(fx.staffA, { warehouseId: fx.a.id, countedCents: 0 })
    const order = await fx.place(3)
    const before = await paymentState()
    const error = await errorOf(() =>
      pickupOrder(fx.staffA, order.id, cash(3000)),
    )
    expect([error.code, error.message]).toEqual(['conflict', noDrawer])
    expect(await paymentState()).toEqual(before)
  })

  test('a missing or malformed payment is refused and changes nothing', async () => {
    const fx = await setupSales()
    const order = await fx.place(3)
    const before = await paymentState()
    const none = await errorOf(() =>
      pickupOrder(fx.staffA, order.id, undefined),
    )
    expect([none.code, none.message]).toEqual(['invalid', choose])
    for (const bad of [
      cash(Number.NaN),
      cash(-1),
      cash(3000.5),
      cash(2 ** 40),
    ]) {
      const error = await errorOf(() => pickupOrder(fx.staffA, order.id, bad))
      expect(error.code).toBe('invalid')
    }
    for (const terms of ['x', 'credito']) {
      expect(
        (
          await errorOf(() =>
            pickupOrder(fx.staffA, order.id, { terms } as never),
          )
        ).message,
      ).toBe(choose)
    }
    expect(await paymentState()).toEqual(before)
  })
})
