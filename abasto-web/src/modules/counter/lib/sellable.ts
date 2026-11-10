export type PriceInfo = {
  presentationId: string
  productId: string
  productName: string
  presentationName: string
  factor: number
  priceCents: number | null
}

export type SellableOption = {
  presentationId: string
  label: string
  productId: string
  /** Base units (pieces) in one presentation. */
  factor: number
  priceCents: number
  /** Whole presentations that can still be reserved. */
  available: number
  /** Base units of the product still available, shared by all its presentations. */
  availableBase: number
}

/** Priced presentations with the whole units available (base units ÷ factor). */
export function buildSellable(
  prices: ReadonlyArray<PriceInfo>,
  stock: ReadonlyArray<{ productId: string; available: number }>,
): Array<SellableOption> {
  const availableOf = new Map(stock.map((s) => [s.productId, s.available]))
  return prices.flatMap((price) =>
    price.priceCents === null
      ? []
      : [
          {
            presentationId: price.presentationId,
            label: `${price.productName} · ${price.presentationName}`,
            productId: price.productId,
            factor: price.factor,
            priceCents: price.priceCents,
            available: Math.floor(
              (availableOf.get(price.productId) ?? 0) / price.factor,
            ),
            availableBase: availableOf.get(price.productId) ?? 0,
          },
        ],
  )
}
