import { and, eq, inArray } from 'drizzle-orm'
import { presentations, products } from '#/modules/catalog/db/schema'
import type { Tx } from '#/modules/inventory/services/stock-ledger'

export type BoxProduct = {
  id: string
  supplierId: string | null
  listPricePerPiece: number
  fixedDiscountPerPiece: number
  promotionPerPiece: number
  /** Base units per box (default presentation); 1 without one. */
  factor: number
  presentationId: string | null
}

/** Products with the factor and id of their default presentation (the box). */
export async function loadBoxProducts(
  tx: Tx,
  ids: Array<string>,
): Promise<Map<string, BoxProduct>> {
  if (!ids.length) return new Map()
  const rows = await tx
    .select({
      id: products.id,
      supplierId: products.supplierId,
      listPricePerPiece: products.listPricePerPiece,
      fixedDiscountPerPiece: products.fixedDiscountPerPiece,
      promotionPerPiece: products.promotionPerPiece,
      factor: presentations.factor,
      presentationId: presentations.id,
    })
    .from(products)
    .leftJoin(
      presentations,
      and(
        eq(presentations.productId, products.id),
        eq(presentations.isDefault, true),
      ),
    )
    .where(inArray(products.id, ids))
  return new Map(
    rows.map((row) => [row.id, { ...row, factor: row.factor ?? 1 }]),
  )
}
