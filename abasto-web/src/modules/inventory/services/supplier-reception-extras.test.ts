import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { products } from '#/modules/catalog/db/schema'
import { savePieceCost } from '#/modules/catalog/services/products'
import {
  createSupplierOrder,
  getSupplierOrder,
  receiveSupplierOrder,
} from '#/modules/inventory/services/supplier-orders'
import { listSupplierPendings } from '#/modules/inventory/services/supplier-pendings'
import {
  errorOf,
  lineFor,
  setupSupplierOrders,
  supplierState,
} from '#/modules/inventory/services/supplier-testing'
import type { SupplierFixture } from '#/modules/inventory/services/supplier-testing'
import type { ReceptionExtraInput } from '#/modules/inventory/services/reception-extras'

beforeEach(() => resetDatabase(db))

/** Milk and soda ordered; "free" (Alpura, box of 6) is not. */
async function pendingOrder(fx: SupplierFixture) {
  const created = await createSupplierOrder(fx.owner, {
    supplierId: fx.supplier.id,
    warehouseId: fx.a.id,
    lines: [lineFor(fx.milk, 10), lineFor(fx.soda, 2)],
  })
  return getSupplierOrder(fx.owner, created.id)
}

type Order = Awaited<ReturnType<typeof pendingOrder>>

const arrive = (order: Order, extras: Array<ReceptionExtraInput>) => ({
  purchaseId: order.id,
  lines: order.lines.map((line) => ({
    lineId: line.id,
    noExpiry: true,
    missingBoxes: 0,
    damagedBoxes: 0,
  })),
  extras,
})

const listPrice = async (id: string) =>
  (
    await db
      .select({ list: products.listPricePerPiece })
      .from(products)
      .where(eq(products.id, id))
  )[0].list

async function rejects(
  fx: SupplierFixture,
  order: Order,
  extras: Array<ReceptionExtraInput>,
  message: string,
) {
  const before = await supplierState()
  const error = await errorOf(() =>
    receiveSupplierOrder(fx.managerA, arrive(order, extras)),
  )
  expect(error.message).toBe(message)
  expect(await supplierState()).toEqual(before)
}

describe('receiveSupplierOrder: products that arrived without being ordered', () => {
  test('ordered lines are marked as ordered', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    expect(order.lines.map((line) => line.ordered)).toEqual([true, true])
  })

  test('an extra enters as a received, unordered line and a lot with the order code at the catalog price', async () => {
    const fx = await setupSupplierOrders()
    await savePieceCost(fx.owner, fx.free.id, { listPricePerPiece: 5000 })
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.managerA,
      arrive(order, [
        { productId: fx.free.id, boxes: 3, expiresOn: '2027-01-15' },
      ]),
    )
    // 18 pieces × 0.5000 = 9.00.
    expect(result.lots).toHaveLength(3)
    expect(result.lots[2]).toMatchObject({
      productId: fx.free.id,
      code: 'E001',
      expiresOn: '2027-01-15',
      receivedQuantity: 18,
      receivedCostCents: 900,
      onHand: 18,
    })
    const stored = await getSupplierOrder(fx.owner, order.id)
    const extra = stored.lines.find((line) => line.productId === fx.free.id)
    expect(extra).toMatchObject({
      ordered: false,
      boxes: 3,
      quantity: 18,
      boxFactor: 6,
      listPricePerPiece: 5000,
      orderedListPricePerPiece: null,
      totalCostCents: 900,
      goodQuantity: 18,
      damagedQuantity: 0,
      missingQuantity: 0,
      lotCode: 'E001',
    })
    expect(stored.totalCostCents).toBe(13440 + 4032 + 900)
    const pendings = await listSupplierPendings(fx.owner, fx.supplier.id)
    expect([...pendings.restock, ...pendings.returns]).toEqual([])
  })

  test('a typed price is used and, with the catalog flag, saved on the product', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(fx.managerA, {
      ...arrive(order, [
        {
          productId: fx.free.id,
          boxes: 2,
          listPricePerPiece: 7500,
          noExpiry: true,
        },
      ]),
      updateCatalogPrices: true,
    })
    // 12 pieces × 0.7500 = 9.00.
    expect(result.lots[2]).toMatchObject({ receivedCostCents: 900 })
    expect(await listPrice(fx.free.id)).toBe(7500)
  })

  test('without the catalog flag the product keeps its price', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    await receiveSupplierOrder(
      fx.managerA,
      arrive(order, [
        {
          productId: fx.free.id,
          boxes: 2,
          listPricePerPiece: 7500,
          noExpiry: true,
        },
      ]),
    )
    expect(await listPrice(fx.free.id)).toBe(0)
  })

  test('rejects a product of another supplier, changing nothing', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    await rejects(
      fx,
      order,
      [{ productId: fx.cola.id, boxes: 1, noExpiry: true }],
      'Ese producto no pertenece a este proveedor.',
    )
  })

  test('rejects an unknown product, changing nothing', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    await rejects(
      fx,
      order,
      [
        {
          productId: '00000000-0000-4000-8000-000000000000',
          boxes: 1,
          noExpiry: true,
        },
      ],
      'No encontramos ese producto.',
    )
  })

  test('rejects a product that is already on the order, changing nothing', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    await rejects(
      fx,
      order,
      [{ productId: fx.milk.id, boxes: 1, noExpiry: true }],
      'Ese producto ya está en el pedido; captura su recepción en su línea.',
    )
  })

  test('rejects the same extra product twice, changing nothing', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    await rejects(
      fx,
      order,
      [
        { productId: fx.free.id, boxes: 1, noExpiry: true },
        { productId: fx.free.id, boxes: 2, noExpiry: true },
      ],
      'Cada producto no pedido solo puede aparecer una vez.',
    )
  })

  test('rejects boxes that are not a whole number above zero, changing nothing', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    for (const boxes of [0, -1, 1.5]) {
      await rejects(
        fx,
        order,
        [{ productId: fx.free.id, boxes, noExpiry: true }],
        'Las cajas de productos no pedidos deben ser un número entero mayor que cero.',
      )
    }
  })

  test('requires an expiry or an explicit none, changing nothing', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    await rejects(
      fx,
      order,
      [{ productId: fx.free.id, boxes: 1 }],
      'Indica la caducidad de cada producto que entra o marca «Sin caducidad».',
    )
  })

  test('rejects an invalid price, changing nothing', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    await rejects(
      fx,
      order,
      [
        {
          productId: fx.free.id,
          boxes: 1,
          noExpiry: true,
          listPricePerPiece: -5,
        },
      ],
      'El costo por pieza debe ser un entero en diezmilésimas, de cero o más.',
    )
  })

  test('an expired extra needs the expired-stock confirmation, changing nothing', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    await rejects(
      fx,
      order,
      [{ productId: fx.free.id, boxes: 1, expiresOn: '2020-01-01' }],
      'Hay productos que entran con la caducidad vencida. Confirma la recepción para aceptarlos.',
    )
  })
})
