import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { summarizeSession } from '#/modules/cash/lib/cash-summary'
import { recordCashEntry } from '#/modules/cash/services/cash-movements'
import { updateProduct } from '#/modules/catalog/services/products'
import { createSupplier } from '#/modules/catalog/services/suppliers'
import { getCounterOverview } from '#/modules/counter/server/counter-overview'
import {
  createCustomer,
  updateCustomer,
} from '#/modules/customers/services/customers'
import { createOrder } from '#/modules/orders/services/orders'
import { receive, setupOrders } from '#/modules/orders/services/testing'

beforeEach(() => resetDatabase(db))

describe('getCounterOverview', () => {
  test('a cash entry shows in the drawer totals of the very next read, and sellable names its unit', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 30 })
    const before = await getCounterOverview(fx.staffA)
    expect(summarizeSession(0, before.cash!.movements).entriesCents).toBe(0)
    await recordCashEntry(fx.staffA, {
      warehouseId: fx.a.id,
      amountCents: 2500,
      reason: 'Cambio',
    })
    const after = await getCounterOverview(fx.staffA)
    const summary = summarizeSession(
      after.cash!.session.openingCents,
      after.cash!.movements,
    )
    expect(summary).toMatchObject({ entriesCents: 2500, expectedCents: 2500 })
    expect(after.cash?.expectedCents).toBe(2500)
    expect(after.sellable[0]).toMatchObject({
      unit: 'piezas',
      presentationName: expect.any(String),
    })
  })

  test('lists the operable warehouse, its orders, active customers and priced stock', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 30 })
    const inactive = await createCustomer(fx.owner, { name: 'Inactivo' })
    await updateCustomer(fx.owner, inactive.id, { active: false })
    const order = await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 6 }],
    })

    const view = await getCounterOverview(fx.staffA)
    expect(view.warehouses).toEqual([{ id: fx.a.id, name: 'Almacén A' }])
    expect(view.selectedId).toBe(fx.a.id)
    expect(view.orders.map((o) => o.id)).toEqual([order.id])
    expect(view.customers).toEqual([
      { id: fx.customer.id, name: 'Distribuidora Norte' },
    ])
    // Piece 1000 and box 12000; 30 − 6 reserved = 24 pieces = 2 boxes.
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
    // setupOrders leaves A's drawer open with no cash in it; its manager may read the history.
    expect(view.cash?.session.warehouseId).toBe(fx.a.id)
    expect(view.cash?.expectedCents).toBe(0)
    expect(view.canViewCashHistory).toBe(true)
  })

  test('each sellable option names its product, SKU, photo and supplier', async () => {
    const fx = await setupOrders()
    const lala = await createSupplier(fx.owner, { name: 'Lala' })
    await updateProduct(fx.owner, fx.milkBox.id, {
      supplierId: lala.id,
      imageUrl: 'https://example.com/leche.png',
    })
    const view = await getCounterOverview(fx.staffA)
    expect(view.sellable[0]).toMatchObject({
      productName: fx.milkBox.name,
      sku: fx.milkBox.sku,
      imageUrl: 'https://example.com/leche.png',
      supplierId: lala.id,
      supplierName: 'Lala',
    })
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
    // Warehouse B has no open drawer; the owner may read its history.
    expect(view.cash).toBeNull()
    expect(view.canViewCashHistory).toBe(true)
  })

  test("a warehouse the actor can't operate falls back to their own", async () => {
    const fx = await setupOrders()
    const view = await getCounterOverview(fx.staffA, fx.b.id)
    expect(view.selectedId).toBe(fx.a.id)
  })
})
