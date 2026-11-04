import type { WarehouseName } from '#/shared/demo/types'

export type PeriodMode = 'daily' | 'weekly' | 'monthly'

export type DateRange = { from: string; to: string }

export type SaleType = 'Venta' | 'Devolución'

/** One delivered sale (or return) with the price and cost frozen at that moment. */
export type SaleEvent = {
  id: string
  type: SaleType
  orderId: string
  channel: string
  customer: string
  promotionName: string
  productId: string
  productName: string
  sku: string
  /** Base unit used to show quantities, e.g. "piezas". */
  unit: string
  warehouse: WarehouseName
  receiptId: string
  lot: string
  /** Quantity in base units, always positive. */
  quantity: number
  presentationName: string
  /** Base units per presentation. */
  priceFactor: number
  /** Cost of one base unit in MXN cents (may carry decimals). */
  unitCostCents: number
  /** Agreed price per presentation in MXN cents. */
  unitPriceCents: number
  /** Price per presentation after discount, in MXN cents. */
  netUnitPriceCents: number
  discountPct: number
  grossCents: number
  netCents: number
  costCents: number
  /** ISO timestamp. */
  date: string
}

/** Signed amounts of an event: returns subtract. All values are MXN cents. */
export type EventAmounts = {
  gross: number
  discount: number
  net: number
  cost: number
  profit: number
  refund: number
  quantity: number
}

export type SalesSummary = {
  gross: number
  discount: number
  net: number
  cost: number
  profit: number
  refund: number
  /** Percentage over net sales; null when net sales are not positive. */
  margin: number | null
  orders: number
  returns: number
}

export type GroupMode = 'product' | 'lot' | 'warehouse' | 'channel'

export type SalesGroup = {
  key: string
  name: string
  rows: Array<SaleEvent>
  summary: SalesSummary
  /** Net quantity per unit, e.g. "432 piezas". */
  units: string
}

export type Reconciliation = {
  beforeDiscounts: number
  discounts: number
  refunds: number
}

/** One layer of stock inside a warehouse. */
export type StockLayer = {
  quantity: number
  /** Cost of one base unit in MXN cents (may carry decimals). */
  unitCostCents: number
  /** Business date (YYYY-MM-DD). */
  receivedDate: string
  expiryDate: string | null
  blocked: boolean
}

export type StockPosition = {
  productId: string
  warehouse: WarehouseName
  reserved: number
  layers: Array<StockLayer>
  /** Business dates of the receipts known for this product and warehouse. */
  entryDates: Array<string>
}

export type LossReason =
  | 'Merma'
  | 'Producto dañado'
  | 'Caducidad'
  | 'Pérdida'
  | 'Diferencia de inventario'
  | 'Faltante en traslado'
  | 'Otras salidas manuales'

export type LossMovementType =
  'Faltante en traslado' | 'Ajuste negativo' | 'Salida manual' | 'Otro'

/** Inventory movement that may represent a loss; it comes from the inventory ledger. */
export type LossMovement = {
  id: string
  ref: string
  type: LossMovementType
  /** Signed base units; negative when stock leaves. */
  quantity: number
  /** ISO timestamp. */
  date: string
  productId: string
  warehouse: WarehouseName
  note: string
  actor: string
  lots: Array<{ lot: string; quantity: number; unitCostCents: number }>
}

export type LossRow = {
  id: string
  date: string
  ref: string
  productId: string
  name: string
  sku: string
  warehouse: WarehouseName
  unit: string
  reason: LossReason
  note: string
  actor: string
  lot: string
  quantity: number
  /** Historical cost in MXN cents. */
  costCents: number
}

export type AgingRow = {
  productId: string
  name: string
  sku: string
  warehouse: WarehouseName
  unit: string
  quantity: number
  reserved: number
  valueCents: number
  lastSale: string | null
  firstKnown: string | null
  days: number | null
  blockedValueCents: number
  expiringValueCents: number
}

/** A line of the sensitive-operation review shown before loading the samples. */
export type ReviewChange = { entity: string; detail: string }

export type SampleReview = {
  risks: Array<string>
  changes: Array<ReviewChange>
}

/** Everything the sample-sales action adds to the module state. */
export type SampleScenario = {
  sales: Array<SaleEvent>
  /** Replacement stock position of the warehouse that received the samples. */
  position: StockPosition
  review: SampleReview
}
