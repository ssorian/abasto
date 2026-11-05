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
  priceCents: number
  /** Whole presentations that can still be reserved. */
  available: number
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
            priceCents: price.priceCents,
            available: Math.floor(
              (availableOf.get(price.productId) ?? 0) / price.factor,
            ),
          },
        ],
  )
}
