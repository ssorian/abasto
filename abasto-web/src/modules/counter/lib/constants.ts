import type {
  OrderChannel,
  PaymentMethod,
} from '#/modules/counter/types/counter'

export const orderChannels: ReadonlyArray<OrderChannel> = [
  'App',
  'Mostrador',
  'Teléfono',
  'WhatsApp',
]

export const paymentMethods: ReadonlyArray<PaymentMethod> = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
]

export const orderStatusFilters = [
  'Todos',
  'Reservado',
  'En preparación',
  'Listo',
  'Parcial',
  'Despachado',
  'Entregado',
  'Cancelado',
] as const

/** Single demo operator; profile switching is out of scope for this stage. */
export const operatorName = 'Mariana Ruiz'

/** Gross margin (%) under which a sale needs a recorded reason. */
export const minimumMarginPct = 10
