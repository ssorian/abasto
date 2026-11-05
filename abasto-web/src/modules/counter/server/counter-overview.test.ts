import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { getCounterOverview } from '#/modules/counter/server/counter-overview'
import {
  createCustomer,
  updateCustomer,
} from '#/modules/customers/services/customers'
import { createOrder } from '#/modules/orders/services/orders'
import { receive, setupOrders } from '#/modules/orders/services/testing'

beforeEach(() => resetDatabase(db))

describe('getCounterOverview', () => {
  test('lists the operable warehouse, its orders, active customers and priced stock', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 30 })
    const inactive = await createCustomer(fx.owner, { name: 'Inactivo' })
    await updateCustomer(fx.owner, inactive.id, { active: false })
    const order = await createOrder(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 6 }],
    })

    const view = await getCounterOverview(fx.clerkA)
    expect(view.warehouses).toEqual([{ id: fx.a.id, name: 'Almacén A' }])
    expect(view.selectedId).toBe(fx.a.id)
    expect(view.orders.map((o) => o.id)).toEqual([order.id])
    expect(view.customers).toEqual([
      { id: fx.customer.id, name: 'Distribuidora Norte' },
    ])
    // Piece 1000 and the derived box 12000; 30 − 6 reserved = 24 pieces = 2 boxes.
    expect(view.sellable).toEqual([
      expect.objectContaining({
        presentationId: fx.pieceId,
        priceCents: 1000,
        available: 24,
      }),
      expect.objectContaining({
        presentationId: fx.boxId,
        priceCents: 12000,
        available: 2,
      }),
    ])
    expect(view.reservationHours).toBe(24)
    expect(view.canSetHours).toBe(false)
  })

  test('the owner sees every warehouse, can set the hours and picks one with the id', async () => {
    const fx = await setupOrders()
    const view = await getCounterOverview(fx.owner, fx.b.id)
    expect(view.warehouses.map((w) => w.name)).toEqual([
      'Almacén A',
      'Almacén B',
    ])
    expect(view.selectedId).toBe(fx.b.id)
    expect(view.canSetHours).toBe(true)
    expect(view.sellable).toEqual([])
  })

  test("a warehouse the actor can't operate falls back to their own", async () => {
    const fx = await setupOrders()
    const view = await getCounterOverview(fx.clerkA, fx.b.id)
    expect(view.selectedId).toBe(fx.a.id)
  })
})
