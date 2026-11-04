import { findCustomer } from '#/shared/demo/customers'
import { isValidMoney } from '#/modules/counter/lib/money'
import { makeId } from '#/modules/counter/lib/ids'
import {
  committedCents,
  exposureCents,
  orderAllocations,
  paidCents,
  remaining,
} from '#/modules/counter/lib/amounts'
import { activeCash, cashExpectedCents } from '#/modules/counter/lib/cash'
import {
  paymentMethods,
  operatorName,
  orderChannels,
} from '#/modules/counter/lib/constants'
import { quoteLine, reserveLine } from '#/modules/counter/lib/quote'
import { isBlocked, lotsFor } from '#/modules/counter/lib/stock'

import type {
  Allocation,
  CheckoutPayment,
  CounterState,
  Order,
  OrderInput,
  PaymentMethod,
} from '#/modules/counter/types/counter'

export const rowKey = (productId: string, allocationId: string) =>
  `${productId}|${allocationId}`

export const pendingShipment = (order: Order) =>
  order.shipments.find((shipment) => !shipment.resolvedAt)

const clone = (state: CounterState) => structuredClone(state)

function requireOrder(state: CounterState, orderId: string) {
  const order = state.orders.find((o) => o.id === orderId)
  if (!order) throw new Error('Pedido no encontrado.')
  return order
}

function requireAllocationLot(
  state: CounterState,
  order: Order,
  productId: string,
  allocation: Allocation,
) {
  return lotsFor(state, productId, order.warehouse).find(
    (lot) => lot.id === allocation.lotId,
  )
}

/** Recomputes the order status from the progress of its allocations. */
function refreshStatus(order: Order) {
  const rows = orderAllocations(order)
  const left = rows.reduce((sum, a) => sum + remaining(a), 0)
  const delivered = rows.some((a) => a.delivered > 0)

  if (pendingShipment(order)) order.status = 'Despachado'
  else if (!left) order.status = delivered ? 'Entregado' : 'Cancelado'
  else if (rows.some((a) => a.prepared > 0)) order.status = 'Listo'
  else if (delivered || rows.some((a) => a.rejected > 0))
    order.status = 'Parcial'
  else order.status = order.picker ? 'En preparación' : 'Reservado'
}

export function createOrder(
  state: CounterState,
  input: OrderInput,
  date: string,
): CounterState {
  const next = clone(state)
  const customer = findCustomer(input.customerId)

  if (
    !customer ||
    !customer.active ||
    !orderChannels.includes(input.channel) ||
    !input.lines.length
  ) {
    throw new Error('Completa cliente, canal, almacén y productos.')
  }
  if (input.fulfillment === 'Domicilio' && !input.address.trim()) {
    throw new Error('Indica el domicilio de entrega.')
  }
  if (input.terms === 'Crédito' && !customer.credit) {
    throw new Error('Este cliente no tiene crédito habilitado.')
  }
  if (
    new Set(input.lines.map((l) => l.productId)).size !== input.lines.length
  ) {
    throw new Error(
      'Agrupa las cantidades de cada producto en una sola partida.',
    )
  }

  const order: Order = {
    id: makeId(input.channel === 'Mostrador' ? 'TKT' : 'ABR'),
    warehouse: input.warehouse,
    customerId: customer.id,
    customer: customer.name,
    channel: input.channel,
    fulfillment: input.fulfillment,
    address: input.address,
    contact: input.contact,
    terms: input.terms,
    notes: input.notes,
    lines: [],
    status: 'Reservado',
    createdAt: date,
    dueDate:
      input.terms === 'Crédito'
        ? new Date(Date.parse(date) + customer.termsDays * 864e5)
            .toISOString()
            .slice(0, 10)
        : date.slice(0, 10),
    shipments: [],
  }

  for (const line of input.lines) {
    const quoted = quoteLine(next, input.warehouse, line)
    reserveLine(next, input.warehouse, quoted)
    order.lines.push(quoted)
  }

  if (
    input.terms === 'Crédito' &&
    exposureCents(next, customer.id) + committedCents(order) >
      customer.creditLimitCents
  ) {
    throw new Error(
      'El pedido supera el crédito disponible del cliente, incluyendo pedidos pendientes.',
    )
  }

  next.orders.unshift(order)
  return next
}

export function prepareOrder(
  state: CounterState,
  orderId: string,
  picker: string,
  quantities: Record<string, number>,
  note: string,
): CounterState {
  const next = clone(state)
  const order = requireOrder(next, orderId)
  if (!picker.trim()) throw new Error('Asigna quién prepara el pedido.')

  let left = 0
  let found = 0
  for (const line of order.lines) {
    for (const a of line.allocations) {
      const max = remaining(a)
      const qty = quantities[rowKey(line.productId, a.id)] ?? 0
      if (!Number.isSafeInteger(qty) || qty < 0 || qty > max) {
        throw new Error(
          'La cantidad preparada supera lo pendiente de ese lote.',
        )
      }
      if (qty) {
        const lot = requireAllocationLot(next, order, line.productId, a)
        if (!lot || isBlocked(lot)) {
          throw new Error(
            'Un lote reservado está bloqueado o vencido. Cancela el pendiente y crea otro pedido.',
          )
        }
      }
      a.prepared = qty
      left += max
      found += qty
    }
  }

  if (!left) throw new Error('No quedan cantidades por preparar.')
  if (found < left && !note.trim()) {
    throw new Error(
      'Registra el motivo del faltante; lo pendiente seguirá reservado.',
    )
  }

  order.picker = picker.trim()
  order.pickNotes = note.trim()
  refreshStatus(order)
  return next
}

export function dispatchPrepared(
  state: CounterState,
  orderId: string,
  date: string,
): CounterState {
  const next = clone(state)
  const order = requireOrder(next, orderId)
  if (!order.picker) throw new Error('Asigna y verifica el surtido primero.')
  if (pendingShipment(order)) {
    throw new Error('Resuelve la entrega en tránsito antes de enviar otra.')
  }

  const shipment: Order['shipments'][number] = {
    id: makeId('ENV'),
    date,
    note: '',
    rows: [],
    confirmations: [],
  }

  for (const line of order.lines) {
    let sentUnits = 0
    for (const a of line.allocations) {
      const qty = a.prepared
      if (!qty) continue
      const lot = requireAllocationLot(next, order, line.productId, a)
      if (
        qty > remaining(a) ||
        !lot ||
        isBlocked(lot) ||
        lot.quantity < qty ||
        lot.reserved < qty
      ) {
        throw new Error(
          'Revisa las cantidades y disponibilidad de los lotes preparados.',
        )
      }
      lot.quantity -= qty
      lot.reserved -= qty
      a.sent += qty
      a.prepared = 0
      sentUnits += qty
      shipment.rows.push({
        productId: line.productId,
        allocationId: a.id,
        qty,
        delivered: 0,
        rejected: 0,
        damaged: false,
      })
    }

    const lots = next.lots[`${line.productId}:${order.warehouse}`]
    next.lots[`${line.productId}:${order.warehouse}`] = lots.filter(
      (lot) => lot.quantity > 0,
    )
    if (sentUnits) {
      next.movements.unshift({
        id: makeId('MOV'),
        productId: line.productId,
        productName: line.productName,
        warehouse: order.warehouse,
        type: 'Despacho',
        qty: -sentUnits,
        ref: order.id,
        note: `${shipment.id} · Preparó ${order.picker}`,
      })
    }
  }

  if (!shipment.rows.length)
    throw new Error('Marca al menos una unidad preparada.')
  order.shipments.push(shipment)
  refreshStatus(order)
  return next
}

function restoreLot(
  state: CounterState,
  order: Order,
  productId: string,
  productName: string,
  a: Allocation,
  qty: number,
  damaged: boolean,
  note: string,
  type: 'Entrega no concretada' | 'Devolución',
) {
  if (!qty) return
  const key = `${productId}:${order.warehouse}`
  state.lots[key] = [
    ...(state.lots[key] ?? []),
    {
      id: makeId('L'),
      code: a.origin.code,
      quantity: qty,
      costCents: a.origin.costCents,
      expiresInDays: a.origin.expiresInDays,
      receivedDaysAgo: a.origin.receivedDaysAgo,
      salePriceCents: a.origin.salePriceCents,
      reserved: 0,
      blocked: damaged,
    },
  ]
  state.movements.unshift({
    id: makeId('MOV'),
    productId,
    productName,
    warehouse: order.warehouse,
    type,
    qty,
    ref: order.id,
    note,
  })
}

export function resolveShipment(
  state: CounterState,
  orderId: string,
  shipmentId: string,
  delivered: Record<string, number>,
  damaged: Record<string, boolean>,
  note: string,
  rejectedQuantities: Record<string, number>,
  date: string,
): CounterState {
  const next = clone(state)
  const order = requireOrder(next, orderId)
  const shipment = order.shipments.find((s) => s.id === shipmentId)
  if (!shipment || shipment.resolvedAt) {
    throw new Error('Esta entrega ya fue resuelta.')
  }

  let changed = 0
  let deliveredNow = 0
  let returnedNow = 0

  for (const row of shipment.rows) {
    const key = rowKey(row.productId, row.allocationId)
    const pending = row.qty - row.delivered - row.rejected
    const qty = delivered[key] ?? 0
    const rejected = rejectedQuantities[key] ?? 0
    if (
      !Number.isSafeInteger(qty) ||
      qty < 0 ||
      !Number.isSafeInteger(rejected) ||
      rejected < 0 ||
      qty + rejected > pending
    ) {
      throw new Error(
        'Lo entregado y regresado no puede superar lo que sigue en ruta.',
      )
    }
    if (rejected && !note.trim()) {
      throw new Error(
        'Indica el motivo del rechazo y confirma que la mercancía regresó.',
      )
    }
    const line = order.lines.find((l) => l.productId === row.productId)
    const a = line?.allocations.find((x) => x.id === row.allocationId)
    if (!line || !a) continue

    row.delivered += qty
    row.rejected += rejected
    row.damaged = row.damaged || (damaged[key] ?? false)
    a.delivered += qty
    a.rejected += rejected
    restoreLot(
      next,
      order,
      line.productId,
      line.productName,
      a,
      rejected,
      damaged[key] ?? false,
      `Rechazo regresado · ${note}`,
      'Entrega no concretada',
    )
    changed += qty + rejected
    deliveredNow += qty
    returnedNow += rejected
  }

  if (!changed) {
    throw new Error('Registra al menos una cantidad entregada o regresada.')
  }
  if (shipment.rows.every((r) => r.delivered + r.rejected === r.qty)) {
    shipment.resolvedAt = date
  }
  shipment.note = note
  shipment.confirmations.push({
    date,
    note,
    delivered: deliveredNow,
    returned: returnedNow,
  })
  refreshStatus(order)
  return next
}

export function cancelRemainder(
  state: CounterState,
  orderId: string,
  note: string,
): CounterState {
  if (!note.trim()) {
    throw new Error('Indica el motivo para cancelar lo pendiente.')
  }
  const next = clone(state)
  const order = requireOrder(next, orderId)
  let count = 0

  for (const line of order.lines) {
    for (const a of line.allocations) {
      const qty = remaining(a)
      if (!qty) continue
      const lot = requireAllocationLot(next, order, line.productId, a)
      if (!lot || lot.reserved < qty) throw new Error('Reserva inconsistente.')
      lot.reserved -= qty
      a.cancelled += qty
      a.prepared = 0
      count += qty
    }
  }

  if (!count) throw new Error('No hay cantidades pendientes de surtir.')
  order.notes = `${order.notes}\nPendiente cancelado: ${note}`.trim()
  refreshStatus(order)
  return next
}

export function addPayment(
  state: CounterState,
  orderId: string,
  type: 'Cobro' | 'Reembolso',
  method: PaymentMethod,
  amountCents: number,
  reference: string,
  tenderedCents: number | undefined,
  date: string,
): CounterState {
  const next = clone(state)
  const order = requireOrder(next, orderId)

  if (!paymentMethods.includes(method) || amountCents <= 0) {
    throw new Error('Ingresa un importe positivo con hasta dos decimales.')
  }
  if (method !== 'Efectivo' && !reference.trim()) {
    throw new Error('Registra la referencia del pago confirmado.')
  }

  const outstanding = committedCents(order) - paidCents(next, orderId)
  if (
    (type === 'Cobro' && amountCents > outstanding) ||
    (type === 'Reembolso' && amountCents > -outstanding)
  ) {
    throw new Error(
      type === 'Cobro'
        ? 'El cobro supera el saldo del pedido.'
        : 'El reembolso supera el saldo a favor.',
    )
  }

  const received = tenderedCents ?? amountCents
  if (type === 'Cobro' && method === 'Efectivo' && received < amountCents) {
    throw new Error('El efectivo recibido no cubre el cobro.')
  }

  const session = activeCash(next, order.warehouse)
  if (method === 'Efectivo' && !session) {
    throw new Error('Abre un turno de caja en este almacén antes de operar.')
  }
  if (
    type === 'Reembolso' &&
    method === 'Efectivo' &&
    session &&
    amountCents > cashExpectedCents(next, session.id)
  ) {
    throw new Error('El efectivo esperado no alcanza para este reembolso.')
  }

  const isCashCharge = type === 'Cobro' && method === 'Efectivo'
  next.payments.unshift({
    id: makeId(type === 'Cobro' ? 'PAG' : 'REEM'),
    orderId,
    type,
    method,
    amountCents,
    reference: reference.trim(),
    date,
    cashSessionId: session?.id,
    actor: operatorName,
    tenderedCents: isCashCharge ? received : undefined,
    changeCents: isCashCharge ? received - amountCents : undefined,
  })
  return next
}

export function returnOrder(
  state: CounterState,
  orderId: string,
  productId: string,
  qty: number,
  damaged: boolean,
  note: string,
  sourceAllocationId: string,
): CounterState {
  const next = clone(state)
  const order = requireOrder(next, orderId)
  const line = order.lines.find((l) => l.productId === productId)
  if (!line || !line.allocations.some((a) => a.delivered > 0)) {
    throw new Error('Selecciona una venta entregada.')
  }

  const eligible = line.allocations.filter((a) => a.id === sourceAllocationId)
  const returnable = eligible.reduce(
    (sum, a) => sum + a.delivered - a.returned,
    0,
  )
  if (!Number.isSafeInteger(qty) || qty <= 0 || qty > returnable) {
    throw new Error('La devolución supera la cantidad pendiente de devolver.')
  }
  if (!note.trim()) throw new Error('Indica el motivo de devolución.')

  let left = qty
  for (const a of eligible) {
    const take = Math.min(left, a.delivered - a.returned)
    if (take) {
      a.returned += take
      restoreLot(
        next,
        order,
        productId,
        line.productName,
        a,
        take,
        damaged,
        `${damaged ? 'Mercancía bloqueada' : 'Reintegro; los lotes vencidos permanecen excluidos'} · ${note}`,
        'Devolución',
      )
      left -= take
    }
    if (!left) break
  }
  return next
}

/** Counter sale: reserve, hand over immediately and register the payment. */
export function checkout(
  state: CounterState,
  input: OrderInput,
  payment: CheckoutPayment | undefined,
  date: string,
): { state: CounterState; orderId: string } {
  if (
    payment &&
    (!isValidMoney(payment.amountCents / 100) || payment.amountCents < 0)
  ) {
    throw new Error('El abono debe ser un importe válido.')
  }
  const session = activeCash(state, input.warehouse)
  if (!session) {
    throw new Error('Abre un turno de caja en este almacén antes de operar.')
  }

  let next = createOrder(
    state,
    { ...input, channel: 'Mostrador', fulfillment: 'Recolección' },
    date,
  )
  const order = next.orders[0]
  order.cashSessionId = session.id
  const orderId = order.id

  const quantities = Object.fromEntries(
    order.lines.flatMap((line) =>
      line.allocations.map((a) => [rowKey(line.productId, a.id), a.qty]),
    ),
  )
  next = prepareOrder(
    next,
    orderId,
    `Caja · ${operatorName}`,
    quantities,
    'Venta en mostrador',
  )
  next = dispatchPrepared(next, orderId, date)
  const shipmentId = next.orders[0].shipments[0].id
  next = resolveShipment(
    next,
    orderId,
    shipmentId,
    quantities,
    {},
    'Retirado en mostrador',
    {},
    date,
  )
  if (payment && payment.amountCents > 0) {
    next = addPayment(
      next,
      orderId,
      'Cobro',
      payment.method,
      payment.amountCents,
      payment.reference,
      payment.tenderedCents,
      date,
    )
  }
  const final = next.orders[0]
  if (
    final.terms === 'Contado' &&
    committedCents(final) !== paidCents(next, orderId)
  ) {
    throw new Error('La venta de contado requiere el cobro completo.')
  }
  return { state: next, orderId }
}
