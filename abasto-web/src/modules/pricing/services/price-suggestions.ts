import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { presentations, products } from '#/modules/catalog/db/schema'
import { lots, purchaseLines, purchases } from '#/modules/inventory/db/schema'
import { productMargins } from '#/modules/pricing/db/schema'
import {
  currentOwnPrices,
  priceKey,
  requireWarehouse,
  roundDiv,
} from '#/modules/pricing/services/price-reads'
import {
  insertPrices,
  requirePresentations,
  validatePrices,
} from '#/modules/pricing/services/prices'
import type { PriceInput } from '#/modules/pricing/services/prices'

export type PriceSuggestion = {
  lotId: string
  productId: string
  productName: string
  presentationId: string
  presentationName: string
  marginBps: number
  currentPriceCents: number | null
  suggestedPriceCents: number
}

async function loadPurchase(purchaseId: string) {
  const purchase = (
    await db
      .select({ id: purchases.id, warehouseId: purchases.warehouseId })
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
  ).at(0)
  if (!purchase) throw new AppError('not_found', 'No encontramos esa compra.')
  return purchase
}

/**
 * Suggested default-presentation price per lot of a purchase:
 * lot unit cost × default factor × (1 + margin), rounded once at the end.
 * Products without a target margin get no suggestion.
 */
export async function suggestPurchasePrices(
  actor: Actor,
  purchaseId: string,
): Promise<Array<PriceSuggestion>> {
  const purchase = await loadPurchase(purchaseId)
  authorize(actor, 'warehouse.view', purchase.warehouseId)
  const rows = await db
    .select({
      lotId: lots.id,
      productId: products.id,
      productName: products.name,
      presentationId: presentations.id,
      presentationName: presentations.name,
      factor: presentations.factor,
      marginBps: productMargins.marginBps,
      quantity: lots.receivedQuantity,
      costCents: lots.receivedCostCents,
    })
    .from(lots)
    .innerJoin(purchaseLines, eq(purchaseLines.id, lots.purchaseLineId))
    .innerJoin(products, eq(products.id, lots.productId))
    .innerJoin(productMargins, eq(productMargins.productId, products.id))
    .innerJoin(
      presentations,
      and(
        eq(presentations.productId, products.id),
        eq(presentations.isDefault, true),
      ),
    )
    .where(eq(purchaseLines.purchaseId, purchaseId))
    .orderBy(asc(products.name), asc(lots.id))
  const defaults = rows.filter((row) => row.marginBps > 0)
  const current = await currentOwnPrices(
    db,
    [purchase.warehouseId],
    defaults.map((row) => row.presentationId),
  )
  return defaults.flatMap(({ factor, quantity, costCents, ...row }) => {
    const suggestedPriceCents = roundDiv(
      BigInt(costCents) * BigInt(factor) * BigInt(10000 + row.marginBps),
      BigInt(quantity) * 10000n,
    )
    if (suggestedPriceCents <= 0) return []
    return [
      {
        ...row,
        currentPriceCents:
          current.get(priceKey(purchase.warehouseId, row.presentationId)) ??
          null,
        suggestedPriceCents,
      },
    ]
  })
}

/** Records the chosen prices in the purchase's warehouse with source `purchase-suggestion`. */
export async function applySuggestedPrices(
  actor: Actor,
  input: { purchaseId: string; prices: Array<PriceInput> },
) {
  const purchase = await loadPurchase(input.purchaseId)
  authorize(actor, 'warehouse.manage', purchase.warehouseId)
  validatePrices(input.prices)
  await db.transaction(async (tx) => {
    await requireWarehouse(tx, purchase.warehouseId)
    const ids = input.prices.map((price) => price.presentationId)
    await requirePresentations(tx, ids)
    const bought = await tx
      .select({ productId: purchaseLines.productId })
      .from(purchaseLines)
      .where(eq(purchaseLines.purchaseId, input.purchaseId))
    const owned = await tx
      .select({ id: presentations.id })
      .from(presentations)
      .where(
        inArray(
          presentations.productId,
          bought.map((line) => line.productId),
        ),
      )
    const allowed = new Set(owned.map((row) => row.id))
    if (ids.some((id) => !allowed.has(id))) {
      throw new AppError('invalid', 'Esa presentación no es de esta compra.')
    }
    await insertPrices(
      tx,
      actor,
      input.prices.map((price) => ({
        ...price,
        warehouseId: purchase.warehouseId,
      })),
      'purchase-suggestion',
    )
  })
}
