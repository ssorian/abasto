import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { saveCommercialRules } from '#/modules/customers/services/commercial-rules'
import { previewQuote } from '#/modules/counter/server/quote-preview'
import { createOrder } from '#/modules/orders/services/orders'
import {
  errorOf,
  orderState,
  receive,
  setupOrders,
} from '#/modules/orders/services/testing'

beforeEach(() => resetDatabase(db))

async function setup() {
  const fx = await setupOrders()
  await receive(fx, { productId: fx.milkBox.id, quantity: 200 })
  await saveCommercialRules(fx.owner, fx.customer.id, [
    { presentationId: fx.pieceId, minQuantity: 10, discountBps: 1000 },
  ])
  const quote = (quantity: number, presentationId = fx.pieceId) =>
    previewQuote(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId, quantity }],
    })
  return { fx, quote }
}

describe('previewQuote', () => {
  test('list price below the rule minimum, discounted price from it', async () => {
    const { quote } = await setup()
    const below = await quote(9)
    expect(below.lines[0]).toMatchObject({
      listPriceCents: 1000,
      unitPriceCents: 1000,
      lineTotalCents: 9000,
      rule: null,
    })
    const at = await quote(10)
    expect(at.lines[0]).toMatchObject({
      unitPriceCents: 900,
      lineTotalCents: 9000,
      rule: { minQuantity: 10, discountBps: 1000 },
    })
    expect(at.totalCents).toBe(9000)
  })

  test('matches the frozen price of the order the service then creates', async () => {
    const { fx, quote } = await setup()
    const preview = await quote(12)
    const order = await createOrder(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 12 }],
    })
    expect(preview.lines[0]?.unitPriceCents).toBe(
      order.lines[0]?.unitPriceCents ?? -1,
    )
    expect(order.totalCents).toBe(preview.totalCents)
  })

  test('a derived box price is quoted and a presentation without price is flagged', async () => {
    const { fx, quote } = await setup()
    expect((await quote(2, fx.boxId)).lines[0]).toMatchObject({
      listPriceCents: 12000,
      lineTotalCents: 24000,
    })
    const nothing = await quote(1, fx.cola.presentations[0].id)
    expect(nothing.lines[0]).toMatchObject({
      listPriceCents: null,
      unitPriceCents: null,
      lineTotalCents: null,
    })
    expect(nothing.totalCents).toBe(0)
  })

  test('is read-only and respects the warehouse permission', async () => {
    const { fx, quote } = await setup()
    const before = await orderState()
    await quote(10)
    expect(await orderState()).toEqual(before)
    expect(
      (
        await errorOf(() =>
          previewQuote(fx.managerB, {
            warehouseId: fx.a.id,
            customerId: fx.customer.id,
            lines: [{ presentationId: fx.pieceId, quantity: 1 }],
          }),
        )
      ).code,
    ).toBe('forbidden')
  })

  test('no lines quote nothing; a bad quantity is rejected', async () => {
    const { fx, quote } = await setup()
    expect(
      await previewQuote(fx.clerkA, {
        warehouseId: fx.a.id,
        customerId: fx.customer.id,
        lines: [],
      }),
    ).toEqual({ lines: [], totalCents: 0 })
    expect((await errorOf(() => quote(0))).message).toBe(
      'La cantidad de cada producto debe ser un entero mayor que cero.',
    )
  })
})
