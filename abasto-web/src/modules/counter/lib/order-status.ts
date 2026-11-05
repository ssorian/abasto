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

const tones: Record<OrderStatus, string> = {
  Reservado: 'bg-[#fff4d6] text-[#8a5a00]',
  Preparado: 'bg-[#e3efff] text-[#1f4f8f]',
  Recogido: 'bg-[#e1f4e7] text-[#256b41]',
  Cancelado: 'bg-[#eef0f3] text-[#5d6b7c]',
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
