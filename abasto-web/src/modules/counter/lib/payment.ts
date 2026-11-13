import { parsePesosToCents } from '#/modules/inventory/lib/cents'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import { formatCents } from '#/modules/pricing/lib/money'
import type { PickupReceipt } from '#/modules/orders/services/pickup-gate'

/** Cash received and the change to hand back, from the pesos the staff member typed. */
export function changeFor(
  totalCents: number,
  tenderedText: string,
): Parsed<{ tenderedCents: number; changeCents: number }> {
  const tendered = parsePesosToCents(tenderedText)
  if (!tendered.ok) return tendered
  if (tendered.value < totalCents) {
    return {
      ok: false,
      message: `Faltan ${formatCents(totalCents - tendered.value)} para cubrir el total.`,
    }
  }
  return {
    ok: true,
    value: {
      tenderedCents: tendered.value,
      changeCents: tendered.value - totalCents,
    },
  }
}

/** The `payment` part of the pickup input for cash. */
export function contadoPayment(
  totalCents: number,
  tenderedText: string,
): Parsed<{ terms: 'contado'; tenderedCents: number }> {
  const change = changeFor(totalCents, tenderedText)
  if (!change.ok) return change
  return {
    ok: true,
    value: { terms: 'contado', tenderedCents: change.value.tenderedCents },
  }
}

/** Rows of the receipt shown after a pickup. */
export function receiptLines(
  totalCents: number,
  receipt: PickupReceipt,
): Array<[string, string]> {
  return [
    ['Total', formatCents(totalCents)],
    ['Efectivo recibido', formatCents(receipt.tenderedCents)],
    ['Cambio', formatCents(receipt.changeCents)],
  ]
}

/** Round pesos steps used for the quick cash amounts, smallest first. */
const quickSteps = [50, 100, 500, 1000]

/**
 * Quick "Efectivo recibido" amounts: the exact total, then up to three round
 * amounts (to the next $50, $100, $500 or $1,000) above it, without repeats.
 */
export function quickCashAmounts(
  totalCents: number,
): Array<{ label: string; cents: number }> {
  const above: Array<number> = []
  for (const step of quickSteps) {
    const cents = Math.ceil(totalCents / (step * 100)) * step * 100
    if (cents > totalCents && !above.includes(cents)) above.push(cents)
  }
  return [
    { label: 'Exacto', cents: totalCents },
    ...above.slice(0, 3).map((cents) => ({
      label: formatCents(cents).replace('.00', ''),
      cents,
    })),
  ]
}
