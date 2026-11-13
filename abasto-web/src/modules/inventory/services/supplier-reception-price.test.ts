import { beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { products } from '#/modules/catalog/db/schema'
import { savePieceCost } from '#/modules/catalog/services/products'
import { purchaseLines } from '#/modules/inventory/db/schema'
import {
  createSupplierOrder,
  getSupplierOrder,
  receiveSupplierOrder,
} from '#/modules/inventory/services/supplier-orders'
import {
  errorOf,
  lineFor,
  setupSupplierOrders,
  supplierState,
} from '#/modules/inventory/services/supplier-testing'
import type { SupplierFixture } from '#/modules/inventory/services/supplier-testing'
import { listSupplierPendings } from '#/modules/inventory/services/supplier-pendings'

beforeEach(() => resetDatabase(db))

/** Milk: 10 boxes of 12 at 1.2000 a piece (net 13.44 a box); soda: 2 boxes of 24 at 0.8400. */
async function pendingOrder(
  fx: SupplierFixture,
  extra: Record<string, unknown> = {},
) {
  const created = await createSupplierOrder(fx.owner, {
    supplierId: fx.supplier.id,
    warehouseId: fx.a.id,
    lines: [lineFor(fx.milk, 10), lineFor(fx.soda, 2)],
    ...extra,
  })
  return getSupplierOrder(fx.owner, created.id)
}

type Order = Awaited<ReturnType<typeof pendingOrder>>
type LineEntry = {
  receivedBoxes?: number
  damagedBoxes?: number
  listPricePerPiece?: number
}

/** Reception of milk (line 0) and soda (line 1); everything good unless stated. */
const arrive = (
  order: Order,
  entries: [LineEntry, LineEntry] = [{}, {}],
  extra: Record<string, unknown> = {},
) => ({
  purchaseId: order.id,
  lines: order.lines.map((line, index) => ({
    lineId: line.id,
    noExpiry: true,
    receivedBoxes: line.boxes,
    damagedBoxes: 0,
    ...entries[index],
  })),
  ...extra,
})

const catalogPrice = async (id: string) =>
  (
    await db
      .select({
        list: products.listPricePerPiece,
        discount: products.fixedDiscountPerPiece,
        promotion: products.promotionPerPiece,
      })
      .from(products)
      .where(eq(products.id, id))
  )[0]

describe('receiveSupplierOrder: list price per piece at reception', () => {
  test('a new order keeps the ordered price next to the list price', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    expect(order.lines[0]).toMatchObject({
      listPricePerPiece: 12000,
      orderedListPricePerPiece: 12000,
    })
  })

  test('a changed price recomputes the line and enters the lot at the received cost', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.managerA,
      arrive(order, [{ listPricePerPiece: 13000 }, {}]),
    )
    // 120 pieces × 1.3000 = 156.00 gross; discounts 120 × 0.0800 = 9.60.
    expect(result.lots[0]).toMatchObject({
      productId: fx.milk.id,
      receivedQuantity: 120,
      receivedCostCents: 14640,
      salePriceCents: 2000,
    })
    expect(result.lots[1]).toMatchObject({ receivedCostCents: 4032 })
    const stored = await getSupplierOrder(fx.owner, order.id)
    expect(stored.lines[0]).toMatchObject({
      listPricePerPiece: 13000,
      orderedListPricePerPiece: 12000,
      grossCostCents: 15600,
      totalCostCents: 14640,
    })
    expect(stored.lines[1]).toMatchObject({
      listPricePerPiece: 8400,
      orderedListPricePerPiece: 8400,
      totalCostCents: 4032,
    })
    expect(stored.totalCostCents).toBe(14640 + 4032)
    // Without the catalog flag only this order changes.
    expect(await catalogPrice(fx.milk.id)).toEqual({
      list: 12000,
      discount: 500,
      promotion: 300,
    })
  })

  test('missing and damaged balances are valued at the received price', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.managerA,
      arrive(order, [
        { receivedBoxes: 8, damagedBoxes: 1, listPricePerPiece: 13000 },
        {},
      ]),
    )
    // Line net 14640 for 120 pieces: 84 good, 24 missing, 12 damaged.
    expect(result.lots[0]).toMatchObject({
      receivedQuantity: 84,
      receivedCostCents: 10248,
    })
    const pendings = await listSupplierPendings(fx.owner, fx.supplier.id)
    const values = Object.fromEntries(
      [...pendings.restock, ...pendings.returns].map((row) => [
        row.kind,
        row.owedValueCents,
      ]),
    )
    expect(values).toEqual({ restock: 2928, return: 1464 })
  })

  test('the catalog flag saves only changed list prices and keeps discounts', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    // The catalog moved after ordering; an unchanged reception price leaves it alone.
    await savePieceCost(fx.owner, fx.soda.id, { listPricePerPiece: 9000 })
    await receiveSupplierOrder(
      fx.managerA,
      arrive(
        order,
        [{ listPricePerPiece: 13000 }, { listPricePerPiece: 8400 }],
        { updateCatalogPrices: true },
      ),
    )
    expect(await catalogPrice(fx.milk.id)).toEqual({
      list: 13000,
      discount: 500,
      promotion: 300,
    })
    expect((await catalogPrice(fx.soda.id)).list).toBe(9000)
  })

  test('rejects a price below the line discount and promotion, changing nothing', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const before = await supplierState()
    const error = await errorOf(() =>
      receiveSupplierOrder(
        fx.managerA,
        arrive(order, [{ listPricePerPiece: 700 }, {}], {
          updateCatalogPrices: true,
        }),
      ),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(
      'El descuento y la promoción no pueden superar el costo por pieza.',
    )
    expect(await supplierState()).toEqual(before)
    expect((await catalogPrice(fx.milk.id)).list).toBe(12000)
  })

  test('rejects a price that is not a whole amount of ten-thousandths, changing nothing', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const before = await supplierState()
    for (const price of [-1, 1.5, 2_147_483_648]) {
      const error = await errorOf(() =>
        receiveSupplierOrder(
          fx.managerA,
          arrive(order, [{ listPricePerPiece: price }, {}]),
        ),
      )
      expect(error.code).toBe('invalid')
      expect(error.message).toBe(
        'El costo por pieza debe ser un entero en diezmilésimas, de cero o más.',
      )
    }
    expect(await supplierState()).toEqual(before)
  })

  test('rejects prices that leave the order below its discounted balances, changing nothing', async () => {
    const fx = await setupSupplierOrders()
    // A first order whose milk never arrived: 13440 owed "Por reponer".
    const first = await pendingOrder(fx)
    await receiveSupplierOrder(
      fx.managerA,
      arrive(first, [{ receivedBoxes: 0 }, {}]),
    )
    const pendings = await listSupplierPendings(fx.owner, fx.supplier.id)
    const order = await pendingOrder(fx, {
      discounts: [{ pendingId: pendings.restock[0].pendingId }],
    })
    const before = await supplierState()
    const error = await errorOf(() =>
      receiveSupplierOrder(
        fx.managerA,
        arrive(order, [{ listPricePerPiece: 800 }, { listPricePerPiece: 0 }]),
      ),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(
      'Los descuentos no pueden superar el total del pedido.',
    )
    expect(await supplierState()).toEqual(before)
  })
})

describe('migration 0031: ordered list price per piece', () => {
  test('existing lines take their list price as the ordered price', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const file = readFileSync(
      new URL(
        '../../../../drizzle/0031_ordered_list_price.sql',
        import.meta.url,
      ),
      'utf8',
    )
    const backfill = file
      .split('--> statement-breakpoint')
      .filter((part) => /UPDATE "purchase_lines"/.test(part))
    expect(backfill).toHaveLength(1)
    const rollback = new Error('rollback')
    const rows = await db
      .transaction(async (tx) => {
        await tx.execute(
          sql`UPDATE purchase_lines SET ordered_list_price_per_piece = NULL`,
        )
        await tx.execute(sql.raw(backfill[0]))
        const result = await tx
          .select({
            list: purchaseLines.listPricePerPiece,
            ordered: purchaseLines.orderedListPricePerPiece,
          })
          .from(purchaseLines)
          .where(eq(purchaseLines.purchaseId, order.id))
        throw Object.assign(rollback, { result })
      })
      .catch((failure: Error & { result?: unknown }) => {
        if (failure !== rollback) throw failure
        return failure.result
      })
    expect(rows).toEqual([
      { list: 12000, ordered: 12000 },
      { list: 8400, ordered: 8400 },
    ])
  })
})
