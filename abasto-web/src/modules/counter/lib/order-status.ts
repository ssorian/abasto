import type { OrderStatus } from '#/modules/orders/db/schema'

export const orderStatusFilters = [
  'Todos',
  'Reservado',
  'Preparado',
  'Recogido',
  'Cancelado',
  'Vencido',
] as const
export type StatusFilter = (typeof orderStatusFilters)[number]

/** Which actions the service allows from this status (L26 transitions). */
export function availableActions(status: OrderStatus) {
  const open = status === 'Reservado' || status === 'Preparado'
  return { prepare: status === 'Reservado', pickup: open, cancel: open }
}

export const drawerClosedNotice = 'Abre la caja antes de cobrar.'

/**
 * Whether the order can be charged now: cash goes into the drawer, so an
 * order that could be delivered still needs an open drawer. The notice is
 * shown before the sale starts, not only after pressing "Entregar".
 */
export function chargeGate(status: OrderStatus, drawerOpen: boolean) {
  if (!availableActions(status).pickup) {
    return { enabled: false, notice: null }
  }
  return drawerOpen
    ? { enabled: true, notice: null }
    : { enabled: false, notice: drawerClosedNotice }
}

const tones: Record<OrderStatus, string> = {
  Reservado: 'bg-[#fff4d6] text-[#8a5a00]',
  Preparado: 'bg-[#f7f1eb] text-[#5b1f8f]',
  Recogido: 'bg-[#e1f4e7] text-[#256b41]',
  Cancelado: 'bg-[#f3f1ee] text-[#766369]',
  Vencido: 'bg-[#fde8e6] text-[#a1372e]',
}

export const statusTone = (status: OrderStatus) => tones[status]

const hints: Record<OrderStatus, string> = {
  Reservado: 'El producto está apartado para este cliente.',
  Preparado: 'Listo para que el cliente pase por él.',
  Recogido: 'El cliente ya recogió el pedido.',
  Cancelado: 'Se canceló y se liberó el producto.',
  Vencido: 'Venció y se liberó el producto.',
}

export const statusHint = (status: OrderStatus) => hints[status]
