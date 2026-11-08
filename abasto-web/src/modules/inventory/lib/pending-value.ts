/** Integer division of non-negative operands, rounded to the nearest unit (halves up). */
export const divideHalfUp = (numerator: bigint, denominator: bigint) =>
  Number((2n * numerator + denominator) / (2n * denominator))

/** Cost of `units` out of a line of `lineUnits` that cost `lineCostCents`, rounded once. */
export const lineShareCents = (
  lineCostCents: number,
  units: number,
  lineUnits: number,
) => divideHalfUp(BigInt(lineCostCents) * BigInt(units), BigInt(lineUnits))

export type OwedEntry = { quantity: number; valueCents: number }

/**
 * Value of the next `units` owed boxes, oldest entries first. `entries` are the
 * owed (positive) ledger rows in order and `settledUnits` the units already
 * settled; each entry is valued at its own cost per unit. The cumulative value
 * is rounded once per entry boundary, so settling everything adds up to the
 * exact owed total.
 */
export function fifoValueCents(
  entries: ReadonlyArray<OwedEntry>,
  settledUnits: number,
  units: number,
) {
  const valueUpTo = (position: number) => {
    let start = 0
    let value = 0
    for (const entry of entries) {
      if (position <= start) break
      const within = Math.min(position - start, entry.quantity)
      value +=
        within === entry.quantity
          ? entry.valueCents
          : divideHalfUp(
              BigInt(entry.valueCents) * BigInt(within),
              BigInt(entry.quantity),
            )
      start += entry.quantity
    }
    return value
  }
  return valueUpTo(settledUnits + units) - valueUpTo(settledUnits)
}
