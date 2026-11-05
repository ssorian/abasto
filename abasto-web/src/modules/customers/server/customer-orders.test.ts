import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { createCustomer } from '#/modules/customers/services/customers'
import { listCustomerOrders } from '#/modules/customers/server/customer-orders'
import { createOrder } from '#/modules/orders/services/orders'
import {
  errorOf,
  receive,
  setupOrders,
} from '#/modules/orders/services/testing'
import { setPrices } from '#/modules/pricing/services/prices'

beforeEach(() => resetDatabase(db))

describe('listCustomerOrders', () => {
  test('lists the customer orders across the warehouses the actor can operate', async () => {
    const fx = await setupOrders()
    await setPrices(fx.owner, {
      warehouseId: fx.b.id,
      prices: [{ presentationId: fx.pieceId, priceCents: 1100 }],
    })
    await receive(fx, { productId: fx.milkBox.id, quantity: 50 })
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 50,
      warehouseId: fx.b.id,
    })
    const other = await createCustomer(fx.owner, { name: 'Otro' })
    const place = (warehouseId: string, customerId: string) =>
      createOrder(fx.owner, {
        warehouseId,
        customerId,
        lines: [{ presentationId: fx.pieceId, quantity: 2 }],
      })
    const inA = await place(fx.a.id, fx.customer.id)
    const inB = await place(fx.b.id, fx.customer.id)
    await place(fx.a.id, other.id)

    const ownerView = await listCustomerOrders(fx.owner, fx.customer.id)
    expect(ownerView.map((o) => o.id).sort()).toEqual([inA.id, inB.id].sort())
    expect(ownerView.find((o) => o.id === inB.id)).toMatchObject({
      warehouseName: 'Almacén B',
      status: 'Reservado',
      totalCents: 2200,
    })

    const clerkView = await listCustomerOrders(fx.clerkA, fx.customer.id)
    expect(clerkView.map((o) => o.id)).toEqual([inA.id])
  })

  test('an unknown customer is not found', async () => {
    const fx = await setupOrders()
    expect(
      (
        await errorOf(() =>
          listCustomerOrders(fx.owner, '00000000-0000-4000-8000-000000000000'),
        )
      ).message,
    ).toBe('No encontramos ese cliente.')
  })
})
