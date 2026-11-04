import { warehouseNames } from '#/shared/demo/types'
import { requireProduct } from '#/modules/inventory/lib/catalog'
import { isValidMoney, newId } from '#/modules/inventory/lib/format'
import {
  consumptionOrder,
  isBlocked,
  isExpired,
  physicalOf,
  requireRecord,
  toView,
  usable,
} from '#/modules/inventory/lib/stock'

import type { WarehouseName } from '#/shared/demo/types'
import type {
  Allocation,
  Count,
  EntryLine,
  InventoryState,
  Lot,
  Movement,
  MovementType,
  StockRecord,
} from '#/modules/inventory/types/inventory'

/** Name recorded as the author of every operation (the demo has a single admin). */
export const ACTOR = 'Mariana Ruiz'

const clone = (state: InventoryState) => structuredClone(state)

function toAllocation(lot: Lot): Allocation {
  return {
    id: lot.id,
    lot: lot.code,
    qty: lot.qty,
    cost: lot.cost,
    expiry: lot.expiry,
  }
}

type MovementDraft = Omit<Movement, 'id' | 'date' | 'actor'> & {
  date?: string
}

function record(state: InventoryState, draft: MovementDraft) {
  state.movements.unshift({
    ...draft,
    id: newId('MOV'),
    date: draft.date ?? new Date().toISOString(),
    actor: ACTOR,
  })
}

export type ReceiveLine = EntryLine & {
  /** Presentation name as typed in the form, kept for the movement note. */
  presentationName?: string
}

/** Registers an entry of lots into one warehouse. Quantities are base units. */
export function receive(
  state: InventoryState,
  warehouse: WarehouseName,
  reference: string,
  date: string,
  lines: ReadonlyArray<ReceiveLine>,
): InventoryState {
  if (!warehouseNames.includes(warehouse) || !lines.length) {
    throw new Error('Selecciona un almacén y agrega un producto.')
  }
  if (
    !date ||
    !Number.isFinite(Date.parse(date)) ||
    Date.parse(date) > Date.now() + 1000
  ) {
    throw new Error('Fecha de recepción inválida.')
  }
  for (const line of lines) {
    requireProduct(line.productId)
    if (
      line.salePrice !== undefined &&
      (!isValidMoney(line.salePrice) || line.salePrice <= 0)
    ) {
      throw new Error(
        'El precio del lote debe ser mayor a cero y tener hasta dos decimales.',
      )
    }
    if (!Number.isSafeInteger(line.qty) || line.qty <= 0 || line.cost <= 0) {
      throw new Error('Revisa cantidades y costos.')
    }
    if (line.expiry && Number.isNaN(Date.parse(line.expiry))) {
      throw new Error('Caducidad inválida.')
    }
  }

  const next = clone(state)
  const entryId = newId('ENT')

  for (const line of lines) {
    const stock = requireRecord(next, line.productId, warehouse)
    if (!stock.lastDate || Date.parse(date) >= Date.parse(stock.lastDate)) {
      stock.last = line.cost
      stock.lastDate = date
    }
    stock.received = true
    const lot: Lot = {
      id: newId('L'),
      code: line.lot,
      qty: line.qty,
      reserved: 0,
      cost: line.cost,
      expiry: line.expiry,
      receivedAt: date,
      receiptId: newId('REC'),
      salePrice: line.salePrice,
      blocked: false,
      blockReason: '',
    }
    stock.lots.push(lot)
    record(next, {
      productId: line.productId,
      warehouse,
      type: 'Entrada',
      qty: line.qty,
      cost: line.cost,
      date,
      lot: line.lot,
      expiry: line.expiry,
      note:
        (reference || 'Entrada de inventario') +
        (isExpired(lot) ? ' · Lote vencido: excluido del disponible' : ''),
      ref: entryId,
      allocations: [toAllocation(lot)],
    })
  }

  next.entries.unshift({
    id: entryId,
    warehouse,
    reference,
    date,
    lines: lines.map(({ presentationName: _name, ...line }) => line),
  })
  return next
}

/** Takes `qty` units out of a record, nearest expiry first; returns the lots taken. */
function consume(
  stock: StockRecord,
  qty: number,
  lotId: string | undefined,
  allowBlocked: boolean,
): Array<Lot> {
  const candidates = stock.lots
    .filter(
      (lot) =>
        (!lotId || lot.id === lotId) && (allowBlocked || !isBlocked(lot)),
    )
    .sort(consumptionOrder)
  if (candidates.reduce((sum, lot) => sum + lot.qty - lot.reserved, 0) < qty) {
    throw new Error(
      'El lote o el inventario vendible no alcanza. Revisa las reservas y los bloqueos.',
    )
  }

  let left = qty
  const taken: Array<Lot> = []
  for (const lot of candidates) {
    const take = Math.min(left, lot.qty - lot.reserved)
    if (take) {
      taken.push({ ...lot, qty: take, reserved: 0 })
      lot.qty -= take
      left -= take
    }
    if (!left) break
  }
  stock.lots = stock.lots.filter((lot) => lot.qty > 0)
  return taken
}

export type StockChangeMode = 'out' | 'adjust'

export type StockChange = {
  productId: string
  warehouse: WarehouseName
  mode: StockChangeMode
  /** Quantity to remove (`out`) or counted physical quantity (`adjust`). */
  value: number
  reason: string
  note?: string
  destination?: WarehouseName
  lotId?: string
}

/** Manual outflow, stock adjustment or transfer departure. */
export function changeStock(
  state: InventoryState,
  change: StockChange,
): InventoryState {
  const {
    productId,
    warehouse,
    mode,
    value,
    reason,
    note,
    destination,
    lotId,
  } = change
  requireProduct(productId)
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    (!value && mode === 'out') ||
    !reason
  ) {
    throw new Error('Completa la cantidad y el motivo.')
  }

  const next = clone(state)
  const stock = requireRecord(next, productId, warehouse)
  const before = usable(toView(stock))
  const delta = mode === 'out' ? -value : value - physicalOf(stock.lots)
  if (!delta) throw new Error('La cantidad coincide con el inventario actual.')
  const isTransfer = reason === 'Transferencia'
  if (isTransfer && (!destination || destination === warehouse)) {
    throw new Error('Selecciona otro almacén.')
  }

  let moved: Array<Lot>
  const ref = newId(isTransfer ? 'TRA' : 'OP')
  const date = new Date().toISOString()

  if (delta < 0) {
    moved = consume(stock, -delta, lotId, !isTransfer)
    if (usable(toView(stock)) < Math.min(before, stock.reserved)) {
      throw new Error(
        'Esta salida afecta mercancía reservada. Cancela los pedidos afectados primero.',
      )
    }
  } else {
    stock.received = true
    moved = [
      {
        id: newId('L'),
        code: 'Ajuste por identificar',
        qty: delta,
        reserved: 0,
        cost: stock.last,
        expiry: '',
        receivedAt: date,
        receiptId: newId('REC'),
        blocked: true,
        blockReason: 'Revisar lote y condición antes de liberar',
      },
    ]
    stock.lots.push(...moved)
  }

  const type: MovementType = isTransfer
    ? 'Transferencia'
    : mode === 'out'
      ? 'Salida manual'
      : delta > 0
        ? 'Ajuste positivo'
        : 'Ajuste negativo'

  record(next, {
    productId,
    warehouse,
    type,
    qty: delta,
    date,
    note: `${reason}${note ? ` · ${note}` : ''}${destination ? ` · En tránsito a ${destination}` : ''}`,
    ref,
    allocations: moved.map(toAllocation),
  })

  if (isTransfer && destination) {
    next.transfers.unshift({
      id: ref,
      productId,
      from: warehouse,
      to: destination,
      qty: value,
      date,
      status: 'En tránsito',
      allocations: structuredClone(moved),
    })
  }
  return next
}

/** Blocks or releases one lot, keeping reserved stock covered. */
export function blockLot(
  state: InventoryState,
  productId: string,
  warehouse: WarehouseName,
  lotId: string,
  blocked: boolean,
  reason = 'Revisión de mercancía',
): InventoryState {
  const next = clone(state)
  const stock = requireRecord(next, productId, warehouse)
  const lot = stock.lots.find((item) => item.id === lotId)
  if (!lot) throw new Error('Lote no encontrado.')
  if (!blocked && isExpired(lot)) {
    throw new Error('Un lote vencido no puede liberarse. Registra su baja.')
  }
  if (blocked && lot.reserved > 0) {
    throw new Error(
      'Este lote está reservado en pedidos. Cancela esas reservas antes de bloquear.',
    )
  }
  const before = usable(toView(stock))
  lot.blocked = blocked
  lot.blockReason = blocked ? reason : ''
  if (usable(toView(stock)) < Math.min(stock.reserved, before)) {
    throw new Error(
      'Este bloqueo afecta reservas. Cancela los pedidos afectados antes de bloquear.',
    )
  }
  record(next, {
    productId,
    warehouse,
    type: blocked ? 'Bloqueo' : 'Liberación',
    qty: 0,
    note: reason,
    lot: lot.code,
    ref: lot.id,
  })
  return next
}

/** Sets or clears (`value` undefined) the lot-specific sale price. */
export function updateLotPrice(
  state: InventoryState,
  productId: string,
  warehouse: WarehouseName,
  lotId: string,
  value: number | undefined,
  reason: string,
): InventoryState {
  if (value !== undefined && (!isValidMoney(value) || value <= 0)) {
    throw new Error('Ingresa un precio mayor a cero con hasta dos decimales.')
  }
  if (!reason.trim()) throw new Error('Indica el motivo del cambio.')
  const next = clone(state)
  const product = requireProduct(productId)
  const lot = requireRecord(next, productId, warehouse).lots.find(
    (item) => item.id === lotId,
  )
  if (!lot) throw new Error('Lote no encontrado.')
  if (lot.salePrice === value) throw new Error('El precio no cambió.')

  next.priceHistory.unshift({
    id: newId('PRE'),
    productId,
    warehouse,
    lot: lot.code,
    previous: lot.salePrice ?? null,
    previousEffective: lot.salePrice ?? product.price,
    next: value ?? null,
    effective: value ?? product.price,
    date: new Date().toISOString(),
    actor: ACTOR,
    reason: reason.trim(),
  })
  lot.salePrice = value
  return next
}

/** Confirms what arrived from a transfer; differences close it with a shortage. */
export function receiveTransfer(
  state: InventoryState,
  transferId: string,
  quantities: Record<string, number>,
  note: string,
): InventoryState {
  const next = clone(state)
  const transfer = next.transfers.find((item) => item.id === transferId)
  if (!transfer || transfer.status !== 'En tránsito') {
    throw new Error('El traslado ya fue recibido.')
  }

  const arrived: Array<Lot> = []
  let count = 0
  for (const lot of transfer.allocations) {
    const qty = quantities[lot.id]
    if (!Number.isSafeInteger(qty) || qty < 0 || qty > lot.qty) {
      throw new Error(
        'Cada cantidad recibida debe estar entre cero y lo enviado.',
      )
    }
    if (qty) arrived.push({ ...lot, id: newId('L'), qty })
    count += qty
  }
  if (count < transfer.qty && !note.trim()) {
    throw new Error('Indica el motivo de la diferencia.')
  }

  const stock = requireRecord(next, transfer.productId, transfer.to)
  stock.received = stock.received || count > 0
  stock.lots.push(...arrived)
  const newest = [...arrived]
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
    .at(0)
  if (
    newest &&
    (!stock.lastDate ||
      Date.parse(newest.receivedAt) >= Date.parse(stock.lastDate))
  ) {
    stock.last = newest.cost
    stock.lastDate = newest.receivedAt
  }

  transfer.received = count
  transfer.missing = transfer.qty - count
  transfer.receivedAt = new Date().toISOString()
  transfer.note = note
  transfer.status = transfer.missing ? 'Recibido con diferencia' : 'Recibido'

  record(next, {
    productId: transfer.productId,
    warehouse: transfer.to,
    type: 'Recepción de traslado',
    qty: count,
    ref: transfer.id,
    note: `Desde ${transfer.from}${note ? ` · ${note}` : ''}`,
    allocations: arrived.map(toAllocation),
  })
  if (transfer.missing) {
    record(next, {
      productId: transfer.productId,
      warehouse: transfer.from,
      type: 'Faltante en traslado',
      qty: 0,
      ref: transfer.id,
      note: `${transfer.missing} unidades no recibidas; traslado cerrado. ${note}`,
      allocations: transfer.allocations
        .filter((lot) => lot.qty > quantities[lot.id])
        .map((lot) => ({
          ...toAllocation(lot),
          qty: lot.qty - quantities[lot.id],
        })),
    })
  }
  return next
}

/** Stores a finished blind count without touching stock. */
export function saveCount(state: InventoryState, count: Count): InventoryState {
  return { ...state, counts: [count, ...state.counts] }
}

/** Adjusts stock to the counted quantity for the given rows and marks them applied. */
export function applyCount(
  state: InventoryState,
  count: Count,
  productIds: ReadonlyArray<string>,
): InventoryState {
  let next = state
  for (const row of count.rows.filter((item) =>
    productIds.includes(item.productId),
  )) {
    const physical = physicalOf(
      requireRecord(next, row.productId, count.warehouse).lots,
    )
    if (physical !== row.system) {
      throw new Error('El inventario cambió desde el conteo. Inicia uno nuevo.')
    }
    next = changeStock(next, {
      productId: row.productId,
      warehouse: count.warehouse,
      mode: 'adjust',
      value: row.count,
      reason: 'Diferencia de conteo',
      note: count.id,
    })
  }
  return {
    ...next,
    counts: next.counts.map((item) =>
      item.id === count.id
        ? {
            ...item,
            rows: item.rows.map((row) =>
              productIds.includes(row.productId)
                ? { ...row, applied: true }
                : row,
            ),
          }
        : item,
    ),
  }
}

/** Stores the minimum stock alert level of one product in one warehouse. */
export function setMinimumStock(
  state: InventoryState,
  productId: string,
  warehouse: WarehouseName,
  min: number,
): InventoryState {
  const next = clone(state)
  requireRecord(next, productId, warehouse).min = min
  return next
}
