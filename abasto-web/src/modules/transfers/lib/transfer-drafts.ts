import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import { parseWholeNumber, toBaseUnits } from '#/modules/inventory/lib/quantity'
import type { TransferStatus } from '#/modules/transfers/db/schema'

/** One product line of the new-transfer form, quantity typed as packs plus loose units. */
export type TransferLineDraft = {
  productId: string
  packs: string
  loose: string
  factor: number
}

export type TransferDraft = {
  fromWarehouseId: string
  toWarehouseId: string
  notes: string
  lines: ReadonlyArray<TransferLineDraft>
}

export function transferInputFromDraft(draft: TransferDraft): Parsed<{
  fromWarehouseId: string
  toWarehouseId: string
  notes: string
  items: Array<{ productId: string; quantity: number }>
}> {
  if (!draft.toWarehouseId || draft.toWarehouseId === draft.fromWarehouseId) {
    return fail('Elige un almacén de destino distinto del origen.')
  }
  if (!draft.lines.length) return fail('Agrega al menos un producto.')
  const items: Array<{ productId: string; quantity: number }> = []
  for (const line of draft.lines) {
    if (!line.productId) return fail('Selecciona el producto en cada línea.')
    const quantity = toBaseUnits(line)
    if (!quantity.ok) return quantity
    items.push({ productId: line.productId, quantity: quantity.value })
  }
  return {
    ok: true,
    value: {
      fromWarehouseId: draft.fromWarehouseId,
      toWarehouseId: draft.toWarehouseId,
      notes: draft.notes.trim(),
      items,
    },
  }
}

/** A line of the receive dialog: units sent and the received quantity as typed. */
export type ReceiveLineDraft = {
  lineId: string
  sent: number
  received: string
}

export function receiveInputFromDraft(
  transferId: string,
  lines: ReadonlyArray<ReceiveLineDraft>,
): Parsed<{
  transferId: string
  lines: Array<{ lineId: string; receivedQuantity: number }>
}> {
  const parsed: Array<{ lineId: string; receivedQuantity: number }> = []
  for (const line of lines) {
    if (!line.received.trim()) return fail('Indica lo recibido en cada línea.')
    const received = parseWholeNumber(line.received)
    if (!received.ok) return received
    if (received.value > line.sent) {
      return fail('Lo recibido no puede ser mayor que lo enviado.')
    }
    parsed.push({ lineId: line.lineId, receivedQuantity: received.value })
  }
  return { ok: true, value: { transferId, lines: parsed } }
}

/** Units that will not arrive, from the lines whose typed quantity is valid. */
export function shortageOf(
  lines: ReadonlyArray<{ sent: number; received: string }>,
): number {
  return lines.reduce((sum, line) => {
    const received = parseWholeNumber(line.received)
    if (!received.ok || !line.received.trim() || received.value > line.sent) {
      return sum
    }
    return sum + line.sent - received.value
  }, 0)
}

/** What the viewer can do with a transfer, given the warehouses they manage. */
export function transferActions(
  transfer: {
    status: TransferStatus
    fromWarehouseId: string
    toWarehouseId: string
  },
  manages: ReadonlySet<string>,
) {
  const inTransit = transfer.status === 'En tránsito'
  return {
    canReceive: inTransit && manages.has(transfer.toWarehouseId),
    canCancel: inTransit && manages.has(transfer.fromWarehouseId),
  }
}
