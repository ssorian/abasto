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

/** An owed ledger row with the pieces per box of the order line it came from. */
export type BoxedEntry = OwedEntry & { boxFactor: number }

/** What is still owed of each entry once the oldest `settledUnits` are taken off. */
export function remainingEntries<TEntry extends BoxedEntry>(
  entries: ReadonlyArray<TEntry>,
  settledUnits: number,
) {
  let skip = settledUnits
  return entries.flatMap((entry) => {
    const used = Math.min(skip, entry.quantity)
    skip -= used
    const remaining = entry.quantity - used
    return remaining > 0 ? [{ ...entry, remaining }] : []
  })
}

/** Whole boxes still owed, each entry counted with its own box factor. */
export const owedBoxesOf = (
  entries: ReadonlyArray<BoxedEntry>,
  settledUnits: number,
) =>
  remainingEntries(entries, settledUnits).reduce(
    (sum, entry) => sum + Math.floor(entry.remaining / entry.boxFactor),
    0,
  )

/**
 * Units that `boxes` boxes settle, oldest owed first, each box counted with the
 * factor of its entry. Null when more boxes are requested than are owed.
 */
export function unitsOfBoxes(
  entries: ReadonlyArray<BoxedEntry>,
  settledUnits: number,
  boxes: number,
): number | null {
  let need = boxes
  let units = 0
  for (const entry of remainingEntries(entries, settledUnits)) {
    const take = Math.min(need, Math.floor(entry.remaining / entry.boxFactor))
    units += take * entry.boxFactor
    need -= take
  }
  return need === 0 ? units : null
}
