import { parsePesosToCents } from '#/modules/inventory/lib/cents'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import { dueLabel } from '#/modules/credit/lib/statement'
import { formatCents } from '#/modules/pricing/lib/money'
import type { PickupReceipt } from '#/modules/orders/services/pickup-gate'

/** Cash received and the change to hand back, from the pesos the clerk typed. */
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

const ownerAsked =
  'Le avisamos al dueño. Cuando lo autorice, vuelve a entregar.'

/**
 * Extra line under a refused credit pickup. Only the two server messages that
 * leave (or already have) a pending request tell the clerk the owner was asked.
 */
export function creditRefusalNote(message: string): string | null {
  return message.startsWith('Este pedido supera el límite') ||
    message.startsWith('Este pedido espera la autorización')
    ? ownerAsked
    : null
}

/** Rows of the receipt shown after a pickup. */
export function receiptLines(
  totalCents: number,
  receipt: PickupReceipt,
  dueOn: string | null,
): Array<[string, string]> {
  if (receipt.terms === 'contado') {
    return [
      ['Total', formatCents(totalCents)],
      ['Efectivo recibido', formatCents(receipt.tenderedCents)],
      ['Cambio', formatCents(receipt.changeCents)],
    ]
  }
  const lines: Array<[string, string]> = [
    ['Total', formatCents(totalCents)],
    ['Cargo a crédito', formatCents(totalCents)],
  ]
  if (dueOn) lines.push(['Vence', dueLabel(dueOn)])
  return lines
}
