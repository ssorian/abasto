import { and, eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import type { Actor } from '#/modules/access/lib/policy'
import { presentations } from '#/modules/catalog/db/schema'
import { getWarehouseStock } from '#/modules/inventory/services/stock-reads'
import type { AssignableProduct } from '#/modules/riders/lib/assign-draft'

/**
 * Products with free stock in the warehouse and the "caja" assign will use:
 * the largest active presentation, or one unit when the product has none.
 * Free stock leaves out reserved and expired units, like the assignment does.
 */
export async function listAssignableProducts(
  actor: Actor,
  warehouseId: string,
): Promise<Array<AssignableProduct>> {
  const stock = (await getWarehouseStock(actor, warehouseId)).filter(
    (product) => product.available > 0,
  )
  if (!stock.length) return []
  const rows = await db
    .select({
      productId: presentations.productId,
      factor: presentations.factor,
    })
    .from(presentations)
    .where(
      and(
        eq(presentations.active, true),
        inArray(
          presentations.productId,
          stock.map((product) => product.productId),
        ),
      ),
    )
  const boxOf = new Map<string, number>()
  for (const { productId, factor } of rows) {
    boxOf.set(productId, Math.max(boxOf.get(productId) ?? 1, factor))
  }
  return stock
    .map((product) => ({
      productId: product.productId,
      name: product.name,
      sku: product.sku,
      boxFactor: boxOf.get(product.productId) ?? 1,
      available: product.available,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}
