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
