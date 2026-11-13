import { beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { products } from '#/modules/catalog/db/schema'
import {
  archiveProduct,
  restoreProduct,
} from '#/modules/catalog/services/product-archive'
import {
  getProduct,
  listAllProducts,
  listProducts,
} from '#/modules/catalog/services/products'
import { getCounterOverview } from '#/modules/counter/server/counter-overview'
import { lots } from '#/modules/inventory/db/schema'
import { setMinimumStock } from '#/modules/inventory/services/stock-minimums'
import { countStock } from '#/modules/inventory/services/stock-counts'
import { createPurchase } from '#/modules/inventory/services/purchases'
import { createSupplierOrder } from '#/modules/inventory/services/supplier-orders'
import { prepareOrder } from '#/modules/orders/services/order-actions'
import { createOrder } from '#/modules/orders/services/orders'
import { getOrder } from '#/modules/orders/services/order-reads'
import {
  errorOf,
  receive,
  setupOrders,
} from '#/modules/orders/services/testing'
import { assignRider } from '#/modules/riders/services/assignments'
import { createRider } from '#/modules/riders/services/riders'
import { getStoreCatalog } from '#/modules/store/services/storefront'
import { dispatchTransfer } from '#/modules/transfers/services/transfer-dispatch'

beforeEach(() => resetDatabase(db))

async function setup() {
  const fx = await setupOrders()
  const product = fx.milkBox
  const archivedAtOf = async () =>
    (
      await db
        .select({ at: products.archivedAt })
        .from(products)
        .where(eq(products.id, product.id))
    )[0].at
  /** Empties every lot without touching orders, to isolate one refusal rule. */
  const emptyLots = () =>
    db
      .update(lots)
      .set({ onHand: 0, reserved: 0 })
      .where(eq(lots.productId, product.id))
  return { fx, product, archivedAtOf, emptyLots }
}

const refused = async (
  run: () => Promise<unknown>,
  archivedAtOf: () => Promise<Date | null>,
  message: RegExp,
) => {
  const error = await errorOf(run)
  expect(error.code).toBe('conflict')
  expect(error.message).toMatch(message)
  expect(await archivedAtOf()).toBeNull()
}

describe('archiveProduct', () => {
  test('archives a product without stock or open work and hides it everywhere', async () => {
    const { fx, product, archivedAtOf } = await setup()
    expect((await getStoreCatalog(fx.a.id)).map((p) => p.id)).toContain(
      product.id,
    )
    const done = await archiveProduct(fx.owner, product.id)
    expect(done.archivedAt).toBeInstanceOf(Date)
    expect(await archivedAtOf()).toBeInstanceOf(Date)

    expect((await listProducts(fx.owner)).map((p) => p.id)).not.toContain(
      product.id,
    )
    const all = await listAllProducts(fx.owner)
    expect(all.find((p) => p.id === product.id)?.archivedAt).not.toBeNull()
    expect((await getStoreCatalog(fx.a.id)).map((p) => p.id)).not.toContain(
      product.id,
    )
    const counter = await getCounterOverview(fx.staffA, fx.a.id)
    expect(counter.sellable.map((s) => s.productId)).not.toContain(product.id)

    const sell = await errorOf(() =>
      createOrder(fx.staffA, {
        warehouseId: fx.a.id,
        customerId: fx.customer.id,
        lines: [{ presentationId: fx.pieceId, quantity: 1 }],
      }),
    )
    expect(sell.message).toMatch(/archivado/)
    const supplierOrder = await errorOf(() =>
      createSupplierOrder(fx.managerA, {
        supplierId: fx.supplier.id,
        warehouseId: fx.a.id,
        lines: [{ productId: product.id, boxes: 1 }],
      }),
    )
    expect(supplierOrder.message).toMatch(/archivado/)
    const purchase = await errorOf(() =>
      createPurchase(fx.owner, {
        supplierId: fx.supplier.id,
        warehouseId: fx.a.id,
        purchasedOn: '2026-11-01',
        lines: [{ productId: product.id, quantity: 5, totalCostCents: 100 }],
      }),
    )
    expect(purchase.message).toMatch(/archivado/)
    const count = await errorOf(() =>
      countStock(fx.managerA, {
        warehouseId: fx.a.id,
        productId: product.id,
        countedQuantity: 0,
      }),
    )
    expect(count.message).toMatch(/archivado/)
    const minimum = await errorOf(() =>
      setMinimumStock(fx.managerA, {
        warehouseId: fx.a.id,
        productId: product.id,
        minimum: 3,
      }),
    )
    expect(minimum.message).toMatch(/archivado/)
    const transfer = await errorOf(() =>
      dispatchTransfer(fx.managerA, {
        fromWarehouseId: fx.a.id,
        toWarehouseId: fx.b.id,
        items: [{ productId: product.id, quantity: 1 }],
      }),
    )
    expect(transfer.code).toBe('conflict')
    expect(transfer.message).toMatch(/archivado/)
  })

  test('restore brings the product back and keeps it editable and sellable', async () => {
    const { fx, product, archivedAtOf } = await setup()
    await archiveProduct(fx.owner, product.id)
    const restored = await restoreProduct(fx.owner, product.id)
    expect(restored.archivedAt).toBeNull()
    expect(await archivedAtOf()).toBeNull()
    expect((await listProducts(fx.owner)).map((p) => p.id)).toContain(
      product.id,
    )
    expect((await getStoreCatalog(fx.a.id)).map((p) => p.id)).toContain(
      product.id,
    )
    await receive(fx, { productId: product.id, quantity: 20 })
    const order = await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 2 }],
    })
    expect(order.lines).toHaveLength(1)
  })

  test('refuses while there is stock on hand in any warehouse', async () => {
    const { fx, product, archivedAtOf } = await setup()
    await receive(fx, {
      productId: product.id,
      quantity: 10,
      warehouseId: fx.b.id,
    })
    await refused(
      () => archiveProduct(fx.owner, product.id),
      archivedAtOf,
      /existencias/,
    )
  })

  test('refuses while units are reserved', async () => {
    const { fx, product, archivedAtOf } = await setup()
    await receive(fx, { productId: product.id, quantity: 10 })
    await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 2 }],
    })
    await refused(
      () => archiveProduct(fx.owner, product.id),
      archivedAtOf,
      /reservadas/,
    )
  })

  test('refuses with an open customer order (Reservado and Preparado)', async () => {
    const { fx, product, archivedAtOf, emptyLots } = await setup()
    await receive(fx, { productId: product.id, quantity: 20 })
    const order = await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 2 }],
    })
    await emptyLots()
    await refused(
      () => archiveProduct(fx.owner, product.id),
      archivedAtOf,
      /pedidos de clientes/,
    )
    await prepareOrder(fx.staffA, order.id)
    await refused(
      () => archiveProduct(fx.owner, product.id),
      archivedAtOf,
      /pedidos de clientes/,
    )
  })

  test('refuses with a supplier order still in Pedido', async () => {
    const { fx, product, archivedAtOf } = await setup()
    await createSupplierOrder(fx.managerA, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      lines: [{ productId: product.id, boxes: 1 }],
    })
    await refused(
      () => archiveProduct(fx.owner, product.id),
      archivedAtOf,
      /pedido a proveedor/,
    )
  })

  test('refuses with a rider delivery en ruta', async () => {
    const { fx, product, archivedAtOf, emptyLots } = await setup()
    await receive(fx, { productId: product.id, quantity: 50 })
    const rider = await createRider(fx.managerA, {
      warehouseId: fx.a.id,
      name: 'Luis',
    })
    await assignRider(fx.staffA, {
      riderId: rider.id,
      lines: [{ productId: product.id, boxes: 1, units: 0 }],
    })
    await emptyLots()
    await refused(
      () => archiveProduct(fx.owner, product.id),
      archivedAtOf,
      /repartidor/,
    )
  })

  test('only the owner can archive or restore', async () => {
    const { fx, product, archivedAtOf } = await setup()
    for (const actor of [fx.managerA, fx.staffA]) {
      const error = await errorOf(() => archiveProduct(actor, product.id))
      expect(error.code).toBe('forbidden')
    }
    expect(await archivedAtOf()).toBeNull()
    await archiveProduct(fx.owner, product.id)
    const error = await errorOf(() => restoreProduct(fx.managerA, product.id))
    expect(error.code).toBe('forbidden')
    expect(await archivedAtOf()).toBeInstanceOf(Date)
  })

  test('unknown products are not found; archiving twice is a no-op', async () => {
    const { fx, product } = await setup()
    const missing = await errorOf(() =>
      archiveProduct(fx.owner, '00000000-0000-4000-8000-000000000000'),
    )
    expect(missing.code).toBe('not_found')
    const first = await archiveProduct(fx.owner, product.id)
    const second = await archiveProduct(fx.owner, product.id)
    expect(second.archivedAt?.getTime()).toBe(first.archivedAt?.getTime())
  })

  test('history keeps resolving the archived product', async () => {
    const { fx, product } = await setup()
    await receive(fx, { productId: product.id, quantity: 20 })
    const order = await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 2 }],
    })
    await db.update(lots).set({ onHand: 0, reserved: 0 })
    await db.execute(
      sql`update orders set status = 'Cancelado' where id = ${order.id}`,
    )
    await archiveProduct(fx.owner, product.id)
    const old = await getOrder(fx.staffA, order.id)
    expect(old.lines[0].productName).toBe('Leche entera 1L')
    expect((await getProduct(fx.owner, product.id)).name).toBe(
      'Leche entera 1L',
    )
  })
})
