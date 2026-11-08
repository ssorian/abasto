/** Contracts for the read-only demo seeds shared by the Mostrador and Clientes modules. */

export const warehouseNames = ['Centro', 'Norte', 'Sur'] as const
export type WarehouseName = (typeof warehouseNames)[number]

/** Sellable form of a product. `factor` is how many base units it contains. */
export type Presentation = {
  id: string
  name: string
  factor: number
  /** Integer MXN cents per one of this presentation. */
  priceCents: number
  /** Own barcode; empty when the presentation is not scannable. */
  barcode: string
  active: boolean
}

export type Product = {
  id: string
  name: string
  brand: string
  description: string
  category: string
  sku: string
  /** Barcode of the default presentation. */
  barcode: string
  /** Imported asset URL. */
  image: string
  /** Name of the base unit (stock is always counted in it), e.g. "piezas". */
  baseUnit: string
  defaultPresentationId: string
  presentations: Array<Presentation>
  /** Integer MXN cents of cost per one default presentation. */
  costCents: number
}

export type StockLot = {
  id: string
  code: string
  /** Quantity in base units. */
  quantity: number
  /** Integer MXN cents of cost per one default presentation. */
  costCents: number
  /** Days from today until the lot expires (seeds are relative to the current date). */
  expiresInDays: number
  receivedDaysAgo: number
  /** Optional lot-specific price in cents per default presentation. */
  salePriceCents?: number
}

export type StockEntry = {
  productId: string
  warehouse: WarehouseName
  /** Whether the warehouse has ever received this product. */
  received: boolean
  /** Base units committed to pending orders. */
  reserved: number
  /** Minimum stock in base units. */
  minStock: number
  lots: Array<StockLot>
}

export type Customer = {
  id: string
  name: string
  contact: string
  phone: string
  addresses: Array<string>
  notes: string
  active: boolean
}

export type OrderLine = {
  productId: string
  /** Quantity in base units. */
  quantity: number
  /** Integer MXN cents per base unit. */
  unitPriceCents: number
}

export type PendingOrder = {
  id: string
  customerId: string
  warehouse: WarehouseName
  lines: Array<OrderLine>
  status: 'Reservado'
  totalCents: number
}
