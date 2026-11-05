import { and, eq, gt } from 'drizzle-orm'
import { db } from '#/db'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { products } from '#/modules/catalog/db/schema'
import { lots, stockMinimums } from '#/modules/inventory/db/schema'
import { byFefo } from '#/modules/inventory/services/stock-ledger'

export type StockLot = {
  id: string
  code: string
  expiresOn: string | null
  receivedAt: Date
  onHand: number
}
export type ProductStock = {
  productId: string
  name: string
  sku: string
  unit: string
  onHand: number
  /** Held by orders; always 0 until reservations exist. */
  reserved: number
  available: number
  minimum: number
  belowMinimum: boolean
  /** Lots with stock, earliest expiry first (no expiry last). */
  lots: Array<StockLot>
}

/** Stock per product in one warehouse, including products that only have a minimum. */
export async function getWarehouseStock(
  actor: Actor,
  warehouseId: string,
): Promise<Array<ProductStock>> {
  authorize(actor, 'warehouse.view', warehouseId)
  const [lotRows, minimumRows] = await Promise.all([
    db
      .select({
        productId: lots.productId,
        id: lots.id,
        code: lots.code,
        expiresOn: lots.expiresOn,
        receivedAt: lots.receivedAt,
        onHand: lots.onHand,
      })
      .from(lots)
      .where(and(eq(lots.warehouseId, warehouseId), gt(lots.onHand, 0))),
    db
      .select()
      .from(stockMinimums)
      .where(eq(stockMinimums.warehouseId, warehouseId)),
  ])
  const productIds = new Set([
    ...lotRows.map((row) => row.productId),
    ...minimumRows.map((row) => row.productId),
  ])
  if (!productIds.size) return []
  const catalog = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      unit: products.unit,
    })
    .from(products)
  return catalog
    .filter((product) => productIds.has(product.id))
    .map((product) => {
      const productLots = lotRows
        .filter((row) => row.productId === product.id)
        .map(({ productId: _productId, ...lot }) => lot)
        .sort(byFefo)
      const onHand = productLots.reduce((sum, lot) => sum + lot.onHand, 0)
      const minimum =
        minimumRows.find((row) => row.productId === product.id)?.minimum ?? 0
      const reserved = 0
      const available = onHand - reserved
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        onHand,
        reserved,
        available,
        minimum,
        belowMinimum: minimum > 0 && available < minimum,
        lots: productLots,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
