import type { WarehouseName } from '#/shared/demo/types'

export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta'
export type PaymentTerms = 'Contado' | 'Crédito'
export type OrderChannel = 'App' | 'Mostrador' | 'Teléfono' | 'WhatsApp'
export type Fulfillment = 'Recolección' | 'Domicilio'
export type OrderStatus =
  | 'Reservado'
  | 'En preparación'
  | 'Listo'
  | 'Parcial'
  | 'Despachado'
  | 'Entregado'
  | 'Cancelado'

/** Stock lot of one product in one warehouse. Quantities are base units. */
export type Lot = {
  id: string
  code: string
  quantity: number
  /** Integer MXN cents per default presentation. */
  costCents: number
  /** Days from today until expiry (negative once expired). */
  expiresInDays: number
  receivedDaysAgo: number
  salePriceCents?: number
  reserved: number
  blocked: boolean
}

/** Immutable lot facts copied into an allocation so a rejected delivery can restore the lot. */
export type LotOrigin = {
  code: string
  costCents: number
  expiresInDays: number
  receivedDaysAgo: number
  salePriceCents?: number
}

/** Slice of one lot reserved for an order line, priced per presentation. */
export type Allocation = {
  id: string
  lotId: string
  lot: string
  origin: LotOrigin
  presentationId: string
  presentationName: string
  /** Base units per presentation. */
  priceFactor: number
  /** Base units. */
  qty: number
  /** Integer MXN cents per presentation. */
  unitPriceCents: number
  /** Cost in cents (can be fractional) per base unit. */
  costPerUnitCents: number
  prepared: number
  sent: number
  delivered: number
  rejected: number
  cancelled: number
  returned: number
}

export type OrderLine = {
  productId: string
  productName: string
  sku: string
  /** Base unit name. */
  unit: string
  /** Base units. */
  qty: number
  /** Human summary of the sold presentations, e.g. "1 cajas + 3 Pieza". */
  soldAs: string
  allocations: Array<Allocation>
}

export type ShipmentRow = {
  productId: string
  allocationId: string
  qty: number
  delivered: number
  rejected: number
  damaged: boolean
}

export type Shipment = {
  id: string
  date: string
  note: string
  rows: Array<ShipmentRow>
  resolvedAt?: string
  confirmations: Array<{
    date: string
    note: string
    delivered: number
    returned: number
  }>
}

export type Order = {
  id: string
  warehouse: WarehouseName
  customerId: string
  customer: string
  channel: OrderChannel | 'Sin registrar'
  fulfillment: Fulfillment
  address: string
  contact: string
  terms: PaymentTerms | 'Sin registrar'
  notes: string
  lines: Array<OrderLine>
  status: OrderStatus
  /** ISO date; null for seeded orders (avoids a server/client clock mismatch). */
  createdAt: string | null
  dueDate?: string
  picker?: string
  pickNotes?: string
  shipments: Array<Shipment>
  cashSessionId?: string
}

export type Payment = {
  id: string
  orderId: string
  type: 'Cobro' | 'Reembolso'
  method: PaymentMethod
  amountCents: number
  reference: string
  date: string
  tenderedCents?: number
  changeCents?: number
  cashSessionId?: string
  actor: string
}

export type CashSession = {
  id: string
  warehouse: WarehouseName
  cashier: string
  openedAt: string
  openingCents: number
  status: 'Abierta' | 'Cerrada'
  closedAt?: string
  countedCents?: number
  expectedCents?: number
  differenceCents?: number
  note?: string
  closedBy?: string
}

export type CashMovement = {
  id: string
  sessionId: string
  type: 'Entrada' | 'Retiro'
  amountCents: number
  reason: string
  date: string
  actor: string
}

export type StockMovement = {
  id: string
  productId: string
  productName: string
  warehouse: WarehouseName
  type: 'Despacho' | 'Entrega no concretada' | 'Devolución'
  qty: number
  ref: string
  note: string
}

export type CounterState = {
  /** Lots keyed by `productId:warehouse`. */
  lots: Record<string, Array<Lot>>
  orders: Array<Order>
  payments: Array<Payment>
  cashSessions: Array<CashSession>
  cashMovements: Array<CashMovement>
  movements: Array<StockMovement>
}

/** Editable order line in the composer. */
export type CartLine = {
  productId: string
  presentationId: string
  /** Whole presentations. */
  qty: number
  /** Loose base units added to the presentation. */
  looseQty: number
  lotId?: string
}

export type OrderInput = {
  warehouse: WarehouseName
  customerId: string
  channel: OrderChannel
  fulfillment: Fulfillment
  address: string
  contact: string
  terms: PaymentTerms
  notes: string
  lines: Array<CartLine>
}

export type CheckoutPayment = {
  method: PaymentMethod
  amountCents: number
  tenderedCents: number
  reference: string
}
