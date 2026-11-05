import { parsePesosToCents } from '#/modules/inventory/lib/cents'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import { formatCents } from '#/modules/pricing/lib/money'
import type { CashMovementType } from '#/modules/cash/db/schema'

type MovementLike = { type: CashMovementType; amountCents: number }

export type SessionSummary = {
  openingCents: number
  salesCents: number
  abonosCents: number
  entriesCents: number
  /** Positive cents taken out of the drawer. */
  withdrawalsCents: number
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
  const abonosCents = sum('abono')
  const entriesCents = sum('entry')
  const withdrawalsCents = -sum('withdrawal')
  return {
    openingCents,
    salesCents,
    abonosCents,
    entriesCents,
    withdrawalsCents,
    expectedCents:
      openingCents + salesCents + abonosCents + entriesCents - withdrawalsCents,
  }
}

/** Counted − expected: negative means cash is missing. */
export function differenceLabel(differenceCents: number): string {
  if (differenceCents === 0) return 'Sin diferencia'
  const amount = formatCents(Math.abs(differenceCents))
  return differenceCents < 0 ? `Faltan ${amount}` : `Sobran ${amount}`
}

/** Counted pesos typed at close → cents and the difference against the expected cash. */
export function closePreview(
  expectedCents: number,
  countedText: string,
): Parsed<{ countedCents: number; differenceCents: number }> {
  const counted = parsePesosToCents(countedText, { allowZero: true })
  if (!counted.ok) return counted
  return {
    ok: true,
    value: {
      countedCents: counted.value,
      differenceCents: counted.value - expectedCents,
    },
  }
}

const labels: Record<CashMovementType, string> = {
  sale: 'Venta',
  abono: 'Abono',
  entry: 'Entrada',
  withdrawal: 'Retiro',
}

export const movementLabel = (type: CashMovementType) => labels[type]
