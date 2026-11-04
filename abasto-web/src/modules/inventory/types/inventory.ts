import type { WarehouseName } from '#/shared/demo/types'

/** Warehouse selector value; `Todos` aggregates the three warehouses. */
export type WarehouseScope = WarehouseName | 'Todos'

/** Product as the inventory module sees it: stock is counted in the base unit. */
export type InventoryProduct = {
  id: string
  name: string
  brand: string
  description: string
  category: string
  sku: string
  barcode: string
  image: string
  /** Base unit label, e.g. "piezas". */
  unit: string
  /** Name of the default presentation, also the pricing unit, e.g. "cajas". */
  packName: string
  /** Base units per default presentation. */
  packFactor: number
  /** MXN per default presentation. */
  price: number
  presentations: Array<{
    id: string
    name: string
    factor: number
    active: boolean
  }>
}

export type Lot = {
  id: string
  code: string
  /** Base units on hand. */
  qty: number
  /** Base units committed to pending orders. */
  reserved: number
  /** MXN per base unit. */
  cost: number
  /** YYYY-MM-DD or empty. */
  expiry: string
  receivedAt: string
  receiptId: string
  /** MXN per default presentation; absent inherits the product price. */
  salePrice?: number
  blocked: boolean
  blockReason: string
}

export type StockRecord = {
  productId: string
  warehouse: WarehouseName
  received: boolean
  reserved: number
  /** Minimum stock in base units. */
  min: number
  /** MXN per base unit of the latest entry. */
  last: number
  lastDate: string
  lots: Array<Lot>
}

/** Read model of a stock record, possibly aggregated over all warehouses. */
export type StockView = {
  received: boolean
  reserved: number
  min: number
  last: number
  lastDate: string
  lots: Array<Lot>
  physical: number
  aggregateAvailable?: number
}

export const movementTypes = [
  'Entrada',
  'Venta',
  'Despacho',
  'Entrega no concretada',
  'Salida manual',
  'Ajuste positivo',
  'Ajuste negativo',
  'Transferencia',
  'Recepción de traslado',
  'Faltante en traslado',
  'Devolución',
  'Bloqueo',
  'Liberación',
] as const
export type MovementType = (typeof movementTypes)[number]

export type Allocation = {
  id: string
  lot: string
  qty: number
  cost: number
  expiry: string
}

export type Movement = {
  id: string
  productId: string
  warehouse: WarehouseName
  type: MovementType
  /** Signed base units. */
  qty: number
  cost?: number
  date: string
  lot?: string
  expiry?: string
  note: string
  ref: string
  actor: string
  allocations?: Array<Allocation>
}

export type EntryLine = {
  productId: string
  /** Base units. */
  qty: number
  /** MXN per base unit. */
  cost: number
  lot: string
  expiry: string
  /** MXN per default presentation. */
  salePrice?: number
}

export type Entry = {
  id: string
  warehouse: WarehouseName
  reference: string
  date: string
  lines: Array<EntryLine>
}

export type CountRow = {
  productId: string
  system: number
  count: number
  applied: boolean
}

export type Count = {
  id: string
  warehouse: WarehouseName
  date: string
  rows: Array<CountRow>
}

export type TransferStatus =
  'En tránsito' | 'Recibido' | 'Recibido con diferencia'

export type Transfer = {
  id: string
  productId: string
  from: WarehouseName
  to: WarehouseName
  qty: number
  date: string
  status: TransferStatus
  /** Lots taken from the origin, copied to the destination on reception. */
  allocations: Array<Lot>
  received?: number
  missing?: number
  receivedAt?: string
  note?: string
}

export type PriceChange = {
  id: string
  productId: string
  warehouse: WarehouseName
  lot: string
  previous: number | null
  previousEffective: number
  next: number | null
  effective: number
  date: string
  actor: string
  reason: string
}

export type LotLabel = {
  code: string
  productId: string
  warehouse: WarehouseName
  lotId: string
  presentationId: string
  lot: string
  createdAt: string
}

export type InventoryState = {
  stocks: Array<StockRecord>
  entries: Array<Entry>
  movements: Array<Movement>
  counts: Array<Count>
  transfers: Array<Transfer>
  priceHistory: Array<PriceChange>
  labels: Array<LotLabel>
}

/** Product state shown by badges and filter chips. */
export type StockStatus =
  | 'Sin inventario'
  | 'Agotado'
  | 'Revisar reservas'
  | 'Bloqueado'
  | 'Reservado'
  | 'Stock bajo'
  | 'Disponible'

export type LotStatus = 'Vencido' | 'Bloqueado' | 'Por vencer' | 'Disponible'
