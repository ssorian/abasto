import { AppError } from '#/lib/errors'
import { productArchived } from '#/modules/catalog/services/product-reads'
import { purchaseLines } from '#/modules/inventory/db/schema'
import type { BoxProduct } from '#/modules/inventory/services/box-products'
import {
  repricedCosts,
  requirePiecePrice,
} from '#/modules/inventory/services/reception-prices'
import { fitsInt4 } from '#/modules/inventory/services/stock-ledger'
import type { Tx } from '#/modules/inventory/services/stock-ledger'

/** A product of the order's supplier that arrived without being ordered. */
export type ReceptionExtraInput = {
  productId: string
  /** Whole boxes (default presentation) that arrived; all of them enter stock. */
  boxes: number
  /** List price per piece charged (ten-thousandths); omitted takes the catalog one. */
  listPricePerPiece?: number
  /** YYYY-MM-DD; required unless `noExpiry`. */
  expiresOn?: string
  noExpiry?: boolean
}

/** Shape checks that need no database: boxes, duplicates and price. */
export function validateExtraShapes(
  extras: ReadonlyArray<ReceptionExtraInput>,
) {
  const seen = new Set<string>()
  for (const extra of extras) {
    if (!Number.isSafeInteger(extra.boxes) || extra.boxes <= 0) {
      throw new AppError(
        'invalid',
        'Las cajas de productos no pedidos deben ser un número entero mayor que cero.',
      )
    }
    if (seen.has(extra.productId)) {
      throw new AppError(
        'invalid',
        'Cada producto no pedido solo puede aparecer una vez.',
      )
    }
    seen.add(extra.productId)
    if (extra.listPricePerPiece !== undefined) {
      requirePiecePrice(extra.listPricePerPiece)
    }
  }
}

/**
 * Inserts one received, unordered purchase line per extra: the catalog
 * discount and promotion apply to the charged list price, and every box
 * arrived good. Returns each new line with what its lot needs.
 */
export async function insertExtraLines(
  tx: Tx,
  order: { id: string; supplierId: string },
  orderedProductIds: ReadonlySet<string>,
  extras: ReadonlyArray<ReceptionExtraInput>,
  catalog: ReadonlyMap<string, BoxProduct>,
  code: string,
) {
  const values = extras.map((extra) => {
    const product = catalog.get(extra.productId)
    if (!product) {
      throw new AppError('not_found', 'No encontramos ese producto.')
    }
    if (product.archivedAt) throw productArchived()
    if (product.supplierId !== order.supplierId) {
      throw new AppError(
        'invalid',
        'Ese producto no pertenece a este proveedor.',
      )
    }
    if (orderedProductIds.has(extra.productId)) {
      throw new AppError(
        'invalid',
        'Ese producto ya está en el pedido; captura su recepción en su línea.',
      )
    }
    const quantity = extra.boxes * product.factor
    if (!fitsInt4(quantity)) {
      throw new AppError('invalid', 'El pedido es demasiado grande.')
    }
    const costs = repricedCosts(
      {
        quantity,
        fixedDiscountPerPiece: product.fixedDiscountPerPiece,
        promotionPerPiece: product.promotionPerPiece,
      },
      extra.listPricePerPiece ?? product.listPricePerPiece,
    )
    return {
      purchaseId: order.id,
      productId: extra.productId,
      quantity,
      boxFactor: product.factor,
      ...costs,
      fixedDiscountPerPiece: product.fixedDiscountPerPiece,
      promotionPerPiece: product.promotionPerPiece,
      orderedListPricePerPiece: null,
      ordered: false,
      goodQuantity: quantity,
      damagedQuantity: 0,
      lotCode: code,
      expiresOn: extra.expiresOn || null,
    }
  })
  if (!values.length) return []
  return tx.insert(purchaseLines).values(values).returning()
}
