import { formatQuantity } from '#/modules/inventory/lib/quantity'

type UnitLine = {
  unit: string
  quantity: number
  receivedQuantity: number | null
}

/** `1 pieza`, `8 piezas`: a count with its unit in the right number. `null` = mixed units. */
export function unitCount(count: number, unit: string | null): string {
  return formatQuantity(count, {
    packName: '',
    factor: 1,
    unit: unit ?? 'unidad',
  })
}

/** The unit every line shares; `null` when the transfer mixes units. */
function sharedUnit(lines: ReadonlyArray<{ unit: string }>): string | null {
  const first = lines.at(0)?.unit
  return first !== undefined && lines.every(({ unit }) => unit === first)
    ? first
    : null
}

/** `8 piezas`, or `5 de 8 piezas` when less arrived than was sent. */
export function lineQuantityLabel(line: UnitLine): string {
  if (
    line.receivedQuantity !== null &&
    line.receivedQuantity !== line.quantity
  ) {
    return `${line.receivedQuantity} de ${unitCount(line.quantity, line.unit)}`
  }
  return unitCount(line.quantity, line.unit)
}

export function cancelDescription(transfer: {
  toWarehouseName: string
  sentTotal: number
  lines: ReadonlyArray<{ unit: string }>
}): string {
  const total = unitCount(transfer.sentTotal, sharedUnit(transfer.lines))
  return `Lo que va hacia ${transfer.toWarehouseName} (${total}) regresa a sus lotes de origen.`
}

export function receiveShortageWarning(
  shortage: number,
  lines: ReadonlyArray<{ unit: string }>,
): string {
  const verb = shortage === 1 ? 'Falta' : 'Faltan'
  return `${verb} ${unitCount(shortage, sharedUnit(lines))}. Esa diferencia quedará registrada y no cuenta como existencia en ningún almacén.`
}

export function shortageLabel(transfer: {
  shortage: number
  sentTotal: number
  lines: ReadonlyArray<{ unit: string }>
}): string {
  const unit = sharedUnit(transfer.lines)
  const verb = transfer.shortage === 1 ? 'Faltó' : 'Faltaron'
  // The count reads "3 de 8 piezas": the unit follows the sent total.
  return `${verb} ${transfer.shortage} de ${unitCount(transfer.sentTotal, unit)}`
}

/** Direction plus who sent the transfer and from where, on both sides of it. */
export function rowSubtitle(transfer: {
  direction: 'out' | 'in'
  createdByName: string
  fromWarehouseName: string
}): string {
  const direction = transfer.direction === 'out' ? 'Salida' : 'Entrada'
  return `${direction} · Enviado por ${transfer.createdByName} desde ${transfer.fromWarehouseName}`
}
