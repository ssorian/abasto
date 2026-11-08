/** Shared fixtures for supplier order and pending tests. */
import { asc } from 'drizzle-orm'
import { db } from '#/db'
import { createProduct } from '#/modules/catalog/services/products'
import { createSupplier } from '#/modules/catalog/services/suppliers'
import {
  purchaseLines,
  purchases,
  supplierPendings,
} from '#/modules/inventory/db/schema'
import {
  inventoryState,
  setupInventory,
} from '#/modules/inventory/services/testing'
import { setPrices } from '#/modules/pricing/services/prices'

export { errorOf } from '#/modules/inventory/services/testing'

type Boxed = {
  id: string
  presentations: Array<{ id: string; factor: number }>
}
export const boxOf = (product: Boxed) =>
  product.presentations.find((item) => item.factor !== 1)!

const boxedProduct = (
  sku: string,
  name: string,
  factor: number,
  supplierId: string,
  terms: { fixedDiscountPerPiece?: number; promotionPerPiece?: number } = {},
) => ({
  name,
  sku,
  category: 'Lácteos',
  unit: 'piezas',
  supplierId,
  supplierCode: `S-${sku}`,
  ...terms,
  presentations: [
    { name: 'Pieza', factor: 1 },
    { name: 'Caja', factor },
  ],
  defaultIndex: 1,
})

/** Gross cost of one box typed in the order, by product SKU (cents, before discounts). */
export const grossPerBoxBySku: Record<string, number> = {
  'ALP-1': 1440,
  'ALP-2': 2016,
  'ALP-3': 0,
  'COL-1': 2400,
}

/** An order line for a fixture product, at its usual gross cost per box unless overridden. */
export const lineFor = (
  product: { id: string; sku: string },
  boxes: number,
  grossCostCents = grossPerBoxBySku[product.sku] * boxes,
) => ({ productId: product.id, boxes, grossCostCents })

/**
 * Inventory fixture plus products sold by boxes:
 * - milk (Alpura, box of 12; discount 0.0500 and promotion 0.0300 on the product): ordered at 14.40 a box
 *   before discounts, net 13.44 a box (96 cents of discount); standard price 2000 in A.
 * - soda (Alpura, box of 24): ordered at 20.16 a box, no discounts; standard price 1500 in A (below cost).
 * - free (Alpura, box of 6): ordered at 0.
 * - cola (Coca-Cola, box of 24): another supplier's product.
 */
export async function setupSupplierOrders() {
  const fx = await setupInventory()
  const cocaCola = await createSupplier(fx.owner, { name: 'Coca-Cola' })
  const milk = await createProduct(
    fx.owner,
    boxedProduct('ALP-1', 'Leche Alpura 1L', 12, fx.supplier.id, {
      fixedDiscountPerPiece: 500,
      promotionPerPiece: 300,
    }),
  )
  const soda = await createProduct(
    fx.owner,
    boxedProduct('ALP-2', 'Refresco Alpura', 24, fx.supplier.id),
  )
  const free = await createProduct(
    fx.owner,
    boxedProduct('ALP-3', 'Muestra Alpura', 6, fx.supplier.id),
  )
  const cola = await createProduct(
    fx.owner,
    boxedProduct('COL-1', 'Cola 600ml', 24, cocaCola.id),
  )
  await setPrices(fx.owner, {
    warehouseId: fx.a.id,
    prices: [
      { presentationId: boxOf(milk).id, priceCents: 2000 },
      { presentationId: boxOf(soda).id, priceCents: 1500 },
    ],
  })
  return { ...fx, cocaCola, milk, soda, free, cola }
}

export type SupplierFixture = Awaited<ReturnType<typeof setupSupplierOrders>>

/** Everything a rejected operation must leave untouched. */
export async function supplierState() {
  return {
    inventory: await inventoryState(),
    purchases: await db.select().from(purchases).orderBy(asc(purchases.id)),
    lines: await db.select().from(purchaseLines).orderBy(asc(purchaseLines.id)),
    pendings: await db
      .select()
      .from(supplierPendings)
      .orderBy(asc(supplierPendings.id)),
  }
}
