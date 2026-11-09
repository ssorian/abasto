/** Integer division of non-negative operands, rounded to the nearest unit (halves up). */
export const divideHalfUp = (numerator: bigint, denominator: bigint) =>
  Number((2n * numerator + denominator) / (2n * denominator))

/** Cost of `units` out of a line of `lineUnits` that cost `lineCostCents`, rounded once. */
export const lineShareCents = (
  lineCostCents: number,
  units: number,
  lineUnits: number,
) => divideHalfUp(BigInt(lineCostCents) * BigInt(units), BigInt(lineUnits))

/**
 * Value of the first `units` (of `quantity`) of an origin entry worth `valueCents`:
 * the whole value once everything is taken, else rounded half up. The value of a
 * partial settlement is the difference of two of these, so settling an entry in
 * pieces always adds up to its exact value.
 */
export const valueUpTo = (
  quantity: number,
  valueCents: number,
  units: number,
) =>
  units >= quantity
    ? valueCents
    : divideHalfUp(BigInt(valueCents) * BigInt(units), BigInt(quantity))

/** The origin entry's numbers a settlement needs. */
export type BalanceNumbers = {
  quantity: number
  valueCents: number
  /** Units and cents already settled (net of reopenings), as positive numbers. */
  settledUnits: number
  settledValueCents: number
  boxFactor: number
}

/** Units and boxes still open of an origin entry. */
export function openOf(entry: BalanceNumbers) {
  const units = entry.quantity - entry.settledUnits
  return { units, boxes: Math.floor(units / entry.boxFactor) }
}

/**
 * Units and value that settling `boxes` boxes closes, each box counted with the
 * entry's own factor. Null when more boxes are requested than are open. Closing
 * everything takes the exact remaining value.
 */
export function settleBoxes(entry: BalanceNumbers, boxes: number) {
  const open = openOf(entry)
  if (boxes > open.boxes) return null
  const units = boxes * entry.boxFactor
  const remaining = entry.valueCents - entry.settledValueCents
  const share =
    valueUpTo(entry.quantity, entry.valueCents, entry.settledUnits + units) -
    valueUpTo(entry.quantity, entry.valueCents, entry.settledUnits)
  return {
    units,
    valueCents: units === open.units ? remaining : Math.min(share, remaining),
  }
}
