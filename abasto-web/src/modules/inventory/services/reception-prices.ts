import { eq } from 'drizzle-orm'
import { AppError } from '#/lib/errors'
import {
  grossLineCents,
  maxTenThousandths,
  netLineCents,
} from '#/lib/utils/supplier-cost'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { products } from '#/modules/catalog/db/schema'
import { purchaseLines } from '#/modules/inventory/db/schema'
import type { BoxProduct } from '#/modules/inventory/services/box-products'
import { fitsInt4 } from '#/modules/inventory/services/stock-ledger'
import type { Tx } from '#/modules/inventory/services/stock-ledger'

/** What repricing needs of a stored order line. */
type PricedLine = {
  id: string
  productId: string
  quantity: number
  listPricePerPiece: number
  orderedListPricePerPiece: number | null
  fixedDiscountPerPiece: number
  promotionPerPiece: number
  grossCostCents: number
  totalCostCents: number
}

export const invalidPiecePrice = () =>
  new AppError(
    'invalid',
    'El costo por pieza debe ser un entero en diezmilésimas, de cero o más.',
  )

export const aboveListPrice = () =>
  new AppError(
    'invalid',
    'El descuento y la promoción no pueden superar el costo por pieza.',
  )

const tooBig = () => new AppError('invalid', 'El pedido es demasiado grande.')

/** A typed price per piece must be a whole, non-negative int4 of ten-thousandths. */
export function requirePiecePrice(price: number) {
  if (!Number.isSafeInteger(price) || price < 0 || price > maxTenThousandths) {
    throw invalidPiecePrice()
  }
}

/**
 * The gross and net cost of a line at another list price per piece, keeping
 * its discount and promotion; rejects a net below zero.
 */
export function repricedCosts(line: PricedLine, listPricePerPiece: number) {
  requirePiecePrice(listPricePerPiece)
  if (line.fixedDiscountPerPiece + line.promotionPerPiece > listPricePerPiece) {
    throw aboveListPrice()
  }
  const grossCostCents = grossLineCents(line.quantity, listPricePerPiece)
  if (!fitsInt4(grossCostCents)) throw tooBig()
  const totalCostCents = netLineCents(
    grossCostCents,
    line.quantity,
    line.fixedDiscountPerPiece,
    line.promotionPerPiece,
  )
  return { listPricePerPiece, grossCostCents, totalCostCents }
}

/**
 * Applies the list prices the supplier actually charged: every line whose
 * price changed gets its gross and net cost recomputed and keeps the ordered
 * price. Returns the lines as they now are (unchanged ones as given) and the
 * product ids whose price changed. The order's discounted balances may not
 * exceed the new total.
 */
export async function applyReceivedPrices<TLine extends PricedLine>(
  tx: Tx,
  stored: ReadonlyArray<TLine>,
  prices: ReadonlyMap<string, number>,
  discountCents: number,
): Promise<{ lines: Array<TLine>; changed: Array<TLine> }> {
  const changed: Array<TLine> = []
  const lines = stored.map((line) => {
    const price = prices.get(line.id)
    if (price === undefined) return line
    const costs = repricedCosts(line, price)
    if (price === line.listPricePerPiece) return line
    const next = {
      ...line,
      ...costs,
      orderedListPricePerPiece:
        line.orderedListPricePerPiece ?? line.listPricePerPiece,
    }
    changed.push(next)
    return next
  })
  const total = lines.reduce((sum, line) => sum + line.totalCostCents, 0)
  if (discountCents > total) {
    throw new AppError(
      'invalid',
      'Los descuentos no pueden superar el total del pedido.',
    )
  }
  for (const line of changed) {
    await tx
      .update(purchaseLines)
      .set({
        listPricePerPiece: line.listPricePerPiece,
        orderedListPricePerPiece: line.orderedListPricePerPiece,
        grossCostCents: line.grossCostCents,
        totalCostCents: line.totalCostCents,
      })
      .where(eq(purchaseLines.id, line.id))
  }
  return { lines, changed }
}

/**
 * Saves changed list prices on the catalog products, keeping their own
 * discount and promotion. Needs the supplier-cost permission.
 */
export async function saveCatalogPrices(
  tx: Tx,
  actor: Actor,
  changed: ReadonlyArray<{ productId: string; listPricePerPiece: number }>,
  catalog: ReadonlyMap<string, BoxProduct>,
) {
  if (!changed.length) return
  authorize(actor, 'catalog.cost')
  for (const line of changed) {
    const product = catalog.get(line.productId)
    if (
      product &&
      product.fixedDiscountPerPiece + product.promotionPerPiece >
        line.listPricePerPiece
    ) {
      throw aboveListPrice()
    }
    await tx
      .update(products)
      .set({ listPricePerPiece: line.listPricePerPiece })
      .where(eq(products.id, line.productId))
  }
}
