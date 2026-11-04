import { makeId } from '#/modules/counter/lib/ids'
import { isValidMoney } from '#/modules/counter/lib/money'
import { operatorName } from '#/modules/counter/lib/constants'

import type { WarehouseName } from '#/shared/demo/types'
import type { CounterState } from '#/modules/counter/types/counter'

export const activeCash = (state: CounterState, warehouse: WarehouseName) =>
  state.cashSessions.find(
    (session) =>
      session.warehouse === warehouse && session.status === 'Abierta',
  )

/** Opening float plus cash charges, minus cash refunds, plus movements of the shift. */
export function cashExpectedCents(state: CounterState, sessionId: string) {
  const session = state.cashSessions.find((s) => s.id === sessionId)
  if (!session) throw new Error('Turno no encontrado.')
  const payments = state.payments
    .filter((p) => p.cashSessionId === sessionId && p.method === 'Efectivo')
    .reduce((sum, p) => sum + p.amountCents * (p.type === 'Cobro' ? 1 : -1), 0)
  const movements = state.cashMovements
    .filter((m) => m.sessionId === sessionId)
    .reduce(
      (sum, m) => sum + m.amountCents * (m.type === 'Entrada' ? 1 : -1),
      0,
    )
  return session.openingCents + payments + movements
}

/** Net charges of the shift for one payment method. */
export const netByMethod = (
  state: CounterState,
  sessionId: string,
  method: string,
) =>
  state.payments
    .filter((p) => p.cashSessionId === sessionId && p.method === method)
    .reduce((sum, p) => sum + p.amountCents * (p.type === 'Cobro' ? 1 : -1), 0)

export function openCash(
  state: CounterState,
  warehouse: WarehouseName,
  openingCents: number,
  openedAt: string,
): CounterState {
  if (!isValidMoney(openingCents / 100) || openingCents < 0) {
    throw new Error('Ingresa un fondo inicial válido.')
  }
  if (activeCash(state, warehouse)) {
    throw new Error('Ya existe una caja abierta en ese almacén.')
  }
  const next = structuredClone(state)
  next.cashSessions.unshift({
    id: makeId('CAJA'),
    warehouse,
    cashier: operatorName,
    openedAt,
    openingCents,
    status: 'Abierta',
  })
  return next
}

export function moveCash(
  state: CounterState,
  sessionId: string,
  type: 'Entrada' | 'Retiro',
  amountCents: number,
  reason: string,
  date: string,
): CounterState {
  const session = state.cashSessions.find((s) => s.id === sessionId)
  if (!session || session.status !== 'Abierta') {
    throw new Error('El turno está cerrado.')
  }
  if (amountCents <= 0 || !reason.trim()) {
    throw new Error('Indica importe y motivo del movimiento.')
  }
  if (type === 'Retiro' && amountCents > cashExpectedCents(state, sessionId)) {
    throw new Error('El retiro supera el efectivo esperado en caja.')
  }
  const next = structuredClone(state)
  next.cashMovements.unshift({
    id: makeId('EFEC'),
    sessionId,
    type,
    amountCents,
    reason: reason.trim(),
    date,
    actor: operatorName,
  })
  return next
}

export function closeCash(
  state: CounterState,
  sessionId: string,
  countedCents: number,
  note: string,
  date: string,
): CounterState {
  const session = state.cashSessions.find((s) => s.id === sessionId)
  if (!session || session.status !== 'Abierta') {
    throw new Error('El turno ya fue cerrado.')
  }
  if (countedCents < 0) throw new Error('Captura el efectivo contado.')

  const expected = cashExpectedCents(state, sessionId)
  const difference = countedCents - expected
  if (difference && !note.trim()) {
    throw new Error('Explica la diferencia antes de cerrar caja.')
  }

  const next = structuredClone(state)
  const closing = next.cashSessions.find((s) => s.id === sessionId)
  if (closing) {
    Object.assign(closing, {
      status: 'Cerrada',
      closedAt: date,
      countedCents,
      expectedCents: expected,
      differenceCents: difference,
      note: note.trim(),
      closedBy: operatorName,
    })
  }
  return next
}
