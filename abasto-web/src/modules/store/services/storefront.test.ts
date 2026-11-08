import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { signIn } from '#/modules/access/lib/testing'
import { createProduct } from '#/modules/catalog/services/products'
import { saveCommercialRules } from '#/modules/customers/services/commercial-rules'
import { createCustomer } from '#/modules/customers/services/customers'
import { orders } from '#/modules/orders/db/schema'
import { createOrder } from '#/modules/orders/services/orders'
import { prepareOrder } from '#/modules/orders/services/order-actions'
import {
  advance,
  errorOf,
  orderState,
  receive,
  setupOrders,
  useClock,
} from '#/modules/orders/services/testing'
import type { OrdersFixture } from '#/modules/orders/services/testing'
import { setPrices } from '#/modules/pricing/services/prices'
import {
  grantStoreAccess,
  requireCustomer,
} from '#/modules/store/services/store-access'
import {
  cancelMyOrder,
  getStoreCatalog,
  listMyOrders,
  listStoreWarehouses,
  placeStoreOrder,
  previewStoreCart,
} from '#/modules/store/services/storefront'

beforeEach(() => {
  useClock(() => new Date())
  return resetDatabase(db)
})

async function customerSession(
  fx: OrdersFixture,
  customerId: string,
  email: string,
) {
  await grantStoreAccess(fx.owner, {
    customerId,
    email,
    password: 'cliente-123',
  })
  return requireCustomer(await signIn(email, 'cliente-123'))
}

async function setupStore() {
  const fx = await setupOrders()
  const shopper = await customerSession(
    fx,
    fx.customer.id,
    'norte@cliente.test',
  )
  return { ...fx, shopper }
}

describe('listStoreWarehouses', () => {
  test('lists every warehouse by name, ids and names only', async () => {
    const fx = await setupOrders()
    const listed = await listStoreWarehouses()
    expect(listed).toEqual(
      [fx.a, fx.b]
        .map(({ id, name }) => ({ id, name }))
        .sort((x, y) => x.name.localeCompare(y.name, 'es')),
    )
  })
})

describe('getStoreCatalog', () => {
  test('shows published products with a price and an availability label, never quantities', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 50 })
    const catalog = await getStoreCatalog(fx.a.id)
    expect(catalog.map((p) => p.name)).toEqual(['Leche entera 1L'])
    expect(catalog[0]).toEqual({
      id: fx.milkBox.id,
      name: 'Leche entera 1L',
      brand: fx.milkBox.brand,
      description: fx.milkBox.description,
      category: 'Lácteos',
      imageUrl: null,
      presentations: [
        {
          id: fx.pieceId,
          name: 'Pieza',
          factor: 1,
          isDefault: true,
          priceCents: 1000,
          availability: 'Disponible',
        },
        // 50 pieces hold 4 boxes: few left.
        {
          id: fx.boxId,
          name: 'Caja',
          factor: 12,
          isDefault: false,
          priceCents: 12000,
          availability: 'Pocas',
        },
      ],
    })
  })

  test('availability: Agotado without free stock, reserved units are not available', async () => {
    const fx = await setupStore()
    expect(
      (await getStoreCatalog(fx.a.id))[0].presentations.map(
        (p) => p.availability,
      ),
    ).toEqual(['Agotado', 'Agotado'])
    await receive(fx, { productId: fx.milkBox.id, quantity: 6 })
    expect(
      (await getStoreCatalog(fx.a.id))[0].presentations[0].availability,
    ).toBe('Disponible')
    await placeStoreOrder(fx.shopper, {
      warehouseId: fx.a.id,
      lines: [{ presentationId: fx.pieceId, quantity: 2 }],
    })
    expect(
      (await getStoreCatalog(fx.a.id))[0].presentations[0].availability,
    ).toBe('Pocas')
  })

  test('the default presentation shows the sale price of the lot an order would take', async () => {
    const fx = await setupOrders()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 30,
      salePriceCents: 950,
    })
    const [milk] = await getStoreCatalog(fx.a.id)
    expect(milk.presentations.map((p) => p.priceCents)).toEqual([950, 12000])
  })

  test('hides unpublished products and other warehouses prices', async () => {
    const fx = await setupOrders()
    const hidden = await createProduct(fx.owner, {
      name: 'Crema oculta',
      sku: 'CRE-1',
      category: 'Lácteos',
      unit: 'piezas',
      published: false,
      presentations: [{ name: 'Pieza', factor: 1 }],
      defaultIndex: 0,
    })
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: hidden.presentations[0].id, priceCents: 500 }],
    })
    expect((await getStoreCatalog(fx.a.id)).map((p) => p.name)).toEqual([
      'Leche entera 1L',
    ])
    expect(await getStoreCatalog(fx.b.id)).toEqual([])
  })

  test('an unknown warehouse is not found', async () => {
    expect(
      (
        await errorOf(() =>
          getStoreCatalog('00000000-0000-4000-8000-000000000000'),
        )
      ).message,
    ).toBe('No encontramos ese almacén.')
  })
})

describe('previewStoreCart', () => {
  test('prices the cart with the customer commercial rules', async () => {
    const fx = await setupStore()
    await saveCommercialRules(fx.owner, fx.customer.id, [
      { presentationId: fx.pieceId, minQuantity: 10, discountBps: 1000 },
    ])
    const preview = await previewStoreCart(fx.shopper, {
      warehouseId: fx.a.id,
      lines: [{ presentationId: fx.pieceId, quantity: 10 }],
    })
    expect(preview.totalCents).toBe(9000)
    expect(preview.lines[0]).toEqual({
      presentationId: fx.pieceId,
      quantity: 10,
      listPriceCents: 1000,
      unitPriceCents: 900,
      lineTotalCents: 9000,
      // Only what the customer needs: no rule ids or customer ids.
      rule: { minQuantity: 10, discountBps: 1000, priceCents: null },
    })
  })
})

describe('previewStoreCart hides unpublished products', () => {
  test('refuses to price an unpublished presentation', async () => {
    const fx = await setupStore()
    const hidden = await createProduct(fx.owner, {
      name: 'Crema oculta',
      sku: 'CRE-1',
      category: 'Lácteos',
      unit: 'piezas',
      published: false,
      presentations: [{ name: 'Pieza', factor: 1 }],
      defaultIndex: 0,
    })
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: hidden.presentations[0].id, priceCents: 500 }],
    })
    const error = await errorOf(() =>
      previewStoreCart(fx.shopper, {
        warehouseId: fx.a.id,
        lines: [{ presentationId: hidden.presentations[0].id, quantity: 1 }],
      }),
    )
    expect(error.code).toBe('conflict')
    expect(error.message).toBe('Ese producto no está disponible en la tienda.')
  })
})

describe('placeStoreOrder', () => {
  test('reserves the cart for the signed-in customer at their price', async () => {
    const fx = await setupStore()
    await receive(fx, { productId: fx.milkBox.id, quantity: 50 })
    await saveCommercialRules(fx.owner, fx.customer.id, [
      { presentationId: fx.boxId, minQuantity: 2, priceCents: 11000 },
    ])
    const placed = await placeStoreOrder(fx.shopper, {
      warehouseId: fx.a.id,
      notes: '  Paso a las 5 ',
      lines: [
        { presentationId: fx.boxId, quantity: 2 },
        { presentationId: fx.pieceId, quantity: 3 },
      ],
    })
    expect(placed).toEqual({
      id: placed.id,
      warehouseId: fx.a.id,
      warehouseName: fx.a.name,
      status: 'Reservado',
      totalCents: 25000,
      notes: 'Paso a las 5',
      createdAt: placed.createdAt,
      expiresAt: new Date(placed.createdAt.getTime() + 24 * 3_600_000),
      lines: [
        {
          productName: 'Leche entera 1L',
          presentationName: 'Caja',
          quantity: 2,
          unitPriceCents: 11000,
          lineTotalCents: 22000,
        },
        {
          productName: 'Leche entera 1L',
          presentationName: 'Pieza',
          quantity: 3,
          unitPriceCents: 1000,
          lineTotalCents: 3000,
        },
      ],
    })
    const [row] = await db.select().from(orders).where(eq(orders.id, placed.id))
    expect(row).toMatchObject({
      customerId: fx.customer.id,
      createdBy: fx.shopper.userId,
      source: 'store',
    })
    const state = await orderState()
    expect(state.lots.map((lot) => lot.reserved)).toEqual([27])
  })

  test('counter orders keep source counter', async () => {
    const fx = await setupOrders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 5 })
    const order = await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 1 }],
    })
    const [row] = await db.select().from(orders).where(eq(orders.id, order.id))
    expect(row.source).toBe('counter')
  })

  test('rejects missing stock and an empty cart and changes nothing', async () => {
    const fx = await setupStore()
    await receive(fx, { productId: fx.milkBox.id, quantity: 5 })
    const before = await orderState()
    expect(
      (
        await errorOf(() =>
          placeStoreOrder(fx.shopper, {
            warehouseId: fx.a.id,
            lines: [{ presentationId: fx.boxId, quantity: 1 }],
          }),
        )
      ).message,
    ).toBe('No hay suficiente existencia disponible de Leche entera 1L.')
    expect(
      (
        await errorOf(() =>
          placeStoreOrder(fx.shopper, { warehouseId: fx.a.id, lines: [] }),
        )
      ).message,
    ).toBe('Agrega al menos un producto al pedido.')
    expect(await orderState()).toEqual(before)
  })

  test('an unpublished product cannot be reserved from the store', async () => {
    const fx = await setupStore()
    const hidden = await createProduct(fx.owner, {
      name: 'Crema oculta',
      sku: 'CRE-1',
      category: 'Lácteos',
      unit: 'piezas',
      published: false,
      presentations: [{ name: 'Pieza', factor: 1 }],
      defaultIndex: 0,
    })
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: hidden.presentations[0].id, priceCents: 500 }],
    })
    await receive(fx, { productId: hidden.id, quantity: 5 })
    const before = await orderState()
    const error = await errorOf(() =>
      placeStoreOrder(fx.shopper, {
        warehouseId: fx.a.id,
        lines: [{ presentationId: hidden.presentations[0].id, quantity: 1 }],
      }),
    )
    expect(error.code).toBe('conflict')
    expect(error.message).toBe('Ese producto no está disponible en la tienda.')
    expect(await orderState()).toEqual(before)
  })
})

describe('my orders', () => {
  test('a customer lists only their own orders, newest first', async () => {
    const fx = await setupStore()
    await receive(fx, { productId: fx.milkBox.id, quantity: 50 })
    const other = await createCustomer(fx.owner, { name: 'Otro' })
    await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: other.id,
      lines: [{ presentationId: fx.pieceId, quantity: 1 }],
    })
    const counter = await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      notes: 'Nota interna del mostrador',
      lines: [{ presentationId: fx.pieceId, quantity: 1 }],
    })
    advance(1)
    const online = await placeStoreOrder(fx.shopper, {
      warehouseId: fx.a.id,
      notes: 'Paso temprano',
      lines: [{ presentationId: fx.pieceId, quantity: 2 }],
    })
    const mine = await listMyOrders(fx.shopper)
    expect(mine.map((o) => o.id)).toEqual([online.id, counter.id])
    // Staff notes on counter orders stay internal.
    expect(mine.map((o) => o.notes)).toEqual(['Paso temprano', ''])
  })

  test('an overdue reservation shows as Vencido', async () => {
    const fx = await setupStore()
    await receive(fx, { productId: fx.milkBox.id, quantity: 5 })
    await placeStoreOrder(fx.shopper, {
      warehouseId: fx.a.id,
      lines: [{ presentationId: fx.pieceId, quantity: 1 }],
    })
    advance(25)
    expect((await listMyOrders(fx.shopper)).map((o) => o.status)).toEqual([
      'Vencido',
    ])
  })

  test('cancels an own Reservado order and releases the stock', async () => {
    const fx = await setupStore()
    await receive(fx, { productId: fx.milkBox.id, quantity: 5 })
    const placed = await placeStoreOrder(fx.shopper, {
      warehouseId: fx.a.id,
      lines: [{ presentationId: fx.pieceId, quantity: 3 }],
    })
    const cancelled = await cancelMyOrder(fx.shopper, placed.id)
    expect(cancelled.status).toBe('Cancelado')
    expect((await orderState()).lots.map((lot) => lot.reserved)).toEqual([0])
  })

  test('cannot cancel a Preparado order or another customer order', async () => {
    const fx = await setupStore()
    await receive(fx, { productId: fx.milkBox.id, quantity: 5 })
    const placed = await placeStoreOrder(fx.shopper, {
      warehouseId: fx.a.id,
      lines: [{ presentationId: fx.pieceId, quantity: 1 }],
    })
    const other = await createCustomer(fx.owner, { name: 'Otro' })
    const foreign = await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: other.id,
      lines: [{ presentationId: fx.pieceId, quantity: 1 }],
    })
    await prepareOrder(fx.staffA, placed.id)
    const before = await orderState()
    const preparing = await errorOf(() => cancelMyOrder(fx.shopper, placed.id))
    expect(preparing.code).toBe('conflict')
    expect(preparing.message).toBe(
      'Tu pedido ya se está preparando. Comunícate con el almacén para cancelarlo.',
    )
    const notMine = await errorOf(() => cancelMyOrder(fx.shopper, foreign.id))
    expect(notMine.code).toBe('not_found')
    expect(notMine.message).toBe('No encontramos ese pedido.')
    expect(await orderState()).toEqual(before)
  })
})
