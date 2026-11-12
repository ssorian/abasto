import { parsePesosToCents } from '#/modules/inventory/lib/cents'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import { formatCents } from '#/modules/pricing/lib/money'
import type { CashMovementType } from '#/modules/cash/db/schema'

type MovementLike = { type: CashMovementType; amountCents: number }

export type SessionSummary = {
  openingCents: number
  salesCents: number
  entriesCents: number
  /** Positive cents taken out of the drawer. */
  withdrawalsCents: number
  /** Signed net of rider differences: negative = shortage, positive = surplus. */
  riderDifferenceCents: number
  expectedCents: number
}

/** Same arithmetic as the service: expected = opening + every signed movement. */
export function summarizeSession(
  openingCents: number,
  movements: ReadonlyArray<MovementLike>,
): SessionSummary {
  const sum = (type: CashMovementType) =>
    movements
      .filter((movement) => movement.type === type)
      .reduce((total, movement) => total + movement.amountCents, 0)
  const salesCents = sum('sale')
  // Legacy 'abono' rows are immutable history: they count as cash in.
  const entriesCents = sum('entry') + sum('abono')
  const withdrawalsCents = 0 - sum('withdrawal')
  // Shortages and surpluses of settled deliveries: kept apart from sales so
  // VENTAS matches Reports, but they are part of the expected cash.
  const riderDifferenceCents = sum('rider_difference')
  return {
    openingCents,
    salesCents,
    entriesCents,
    withdrawalsCents,
    riderDifferenceCents,
    expectedCents:
      openingCents +
      salesCents +
      entriesCents +
      riderDifferenceCents -
      withdrawalsCents,
  }
}

/** Counted − expected: negative means cash is missing. */
export function differenceLabel(differenceCents: number): string {
  if (differenceCents === 0) return 'Sin diferencia'
  const amount = formatCents(Math.abs(differenceCents))
  return differenceCents < 0 ? `Faltan ${amount}` : `Sobran ${amount}`
}

/** Counted pesos typed at a blind close → cents; the server computes the difference. */
export function countedCash(countedText: string): Parsed<number> {
  return parsePesosToCents(countedText, { allowZero: true })
}

const labels: Record<Exclude<CashMovementType, 'rider_difference'>, string> = {
  sale: 'Venta',
  abono: 'Entrada', // legacy rows only; nothing creates them anymore
  entry: 'Entrada',
  withdrawal: 'Retiro',
}

/** Label of a rider difference by its sign (negative = shortage). */
export const riderDifferenceLabel = (amountCents: number) =>
  amountCents < 0 ? 'Faltante de reparto' : 'Sobrante de reparto'

/** The amount is needed because a rider difference is a shortage or a surplus. */
export const movementLabel = (type: CashMovementType, amountCents: number) =>
  type === 'rider_difference' ? riderDifferenceLabel(amountCents) : labels[type]
