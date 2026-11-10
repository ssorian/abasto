/** Same rounding as the server's pricing: half up on `numerator ÷ denominator`. */
const roundDiv = (numerator: bigint, denominator: bigint) =>
  Number((2n * numerator + denominator) / (2n * denominator))

export type PricedAllocation = {
  quantity: number
  /** Frozen price of one default presentation (box) of the lot. */
  priceCents: number
  /** Base units in that presentation. */
  priceFactor: number
  /** Frozen warehouse price of one loose piece; null falls back to the prorated box price. */
  pieceCents: number | null
}

export type PricedSale = { sold: number; cents: number }

/**
 * Prices what a line sold, shared by the settlement and its preview.
 *
 * Sold units are taken from the oldest allocation first (`allocations` must
 * come oldest first). Of the line's whole sold quantity, the first
 * `floor(sold ÷ box) × box` units in that order are whole boxes, charged at
 * their allocation's frozen box price (a box that spans two allocations is
 * prorated between their box prices); the remaining loose units are the
 * newest ones and are charged at the frozen piece price. An allocation
 * without a piece price charges all its sold units at the prorated box price.
 */
export function priceSold(
  allocations: ReadonlyArray<PricedAllocation>,
  totalSold: number,
): Array<PricedSale> {
  const box = allocations.at(0)?.priceFactor ?? 1
  let boxUnitsLeft = Math.floor(totalSold / box) * box
  let toSell = totalSold
  return allocations.map((allocation) => {
    const sold = Math.min(allocation.quantity, toSell)
    toSell -= sold
    const inBoxes = Math.min(sold, boxUnitsLeft)
    boxUnitsLeft -= inBoxes
    const prorated = (units: number) =>
      units === 0
        ? 0
        : roundDiv(
            BigInt(units) * BigInt(allocation.priceCents),
            BigInt(allocation.priceFactor),
          )
    if (allocation.pieceCents === null) {
      return { sold, cents: prorated(sold) }
    }
    return {
      sold,
      cents: prorated(inBoxes) + (sold - inBoxes) * allocation.pieceCents,
    }
  })
}
