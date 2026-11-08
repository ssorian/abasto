import { currentOwnPrices } from '#/modules/pricing/services/price-reads'
import { lots } from '#/modules/inventory/db/schema'
import type { BoxProduct } from '#/modules/inventory/services/box-products'
import { appendMovement } from '#/modules/inventory/services/stock-ledger'
import type { Lot, Tx } from '#/modules/inventory/services/stock-ledger'

/** Current standard price of each product's box in a warehouse, by product id. */
export async function standardBoxPrices(
  tx: Tx,
  warehouseId: string,
  boxProducts: Iterable<BoxProduct>,
) {
  const withPresentation = [...boxProducts].filter(
    (product) => product.presentationId,
  )
  const prices = await currentOwnPrices(
    tx,
    [warehouseId],
    withPresentation.map((product) => product.presentationId!),
  )
  return new Map(
    withPresentation.flatMap((product) => {
      const price = prices.get(`${warehouseId}:${product.presentationId}`)
      return price === undefined ? [] : [[product.id, price] as const]
    }),
  )
}

/**
 * The lot freezes the standard price only when it covers the cost per box;
 * otherwise it has no price of its own and follows the standard.
 * Compared without rounding: price per box × boxes ≥ the lot cost.
 */
export function lotSalePrice(
  standardCents: number | undefined,
  costCents: number,
  boxes: number,
) {
  if (standardCents === undefined || standardCents <= 0) return null
  return BigInt(standardCents) * BigInt(boxes) >= BigInt(costCents)
    ? standardCents
    : null
}

/** Creates a lot and brings it to `units` with a 'purchase' movement. */
export async function receiveLot(
  tx: Tx,
  input: {
    productId: string
    warehouseId: string
    purchaseLineId: string | null
    purchaseId: string
    code: string
    expiresOn: string | null
    units: number
    costCents: number
    salePriceCents: number | null
    reason: string
    actorId: string
  },
): Promise<Lot> {
  const [lot] = await tx
    .insert(lots)
    .values({
      productId: input.productId,
      warehouseId: input.warehouseId,
      purchaseLineId: input.purchaseLineId,
      code: input.code,
      expiresOn: input.expiresOn,
      receivedQuantity: input.units,
      receivedCostCents: input.costCents,
      salePriceCents: input.salePriceCents,
      onHand: 0,
    })
    .returning()
  await appendMovement(tx, lot, {
    type: 'purchase',
    quantity: input.units,
    reason: input.reason,
    reference: input.purchaseId,
    actorId: input.actorId,
  })
  return { ...lot, onHand: input.units }
}
