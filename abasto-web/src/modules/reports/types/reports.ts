/** Shapes shared by the report services, CSV builders and screens. Money is integer cents. */

/** `7` and `30` are rolling days; `week` and `month` are calendar periods up to today. */
export type PeriodPreset = 'today' | '7' | '30' | 'week' | 'month' | 'custom'

/**
 * Period asked by the user; `from` and `to` (YYYY-MM-DD) matter for `custom`
 * only. `anchor` replaces today for the other presets, to ask for a past day,
 * week or month.
 */
export type PeriodInput = {
  preset: PeriodPreset
  from?: string
  to?: string
  anchor?: string
}

/** Business dates (America/Mexico_City), both included. */
export type DateRange = { from: string; to: string }

export type ReportWarehouse = { id: string; name: string }

export type ReportSupplier = { id: string; name: string; active: boolean }

export type SalesTotals = {
  orders: number
  /** Base units sold. */
  units: number
  revenueCents: number
  costCents: number
  marginCents: number
}

export type SalesRow = SalesTotals & {
  /** Day, product id, customer id or warehouse id. */
  key: string
  name: string
}

export type ProductSalesRow = SalesRow & { sku: string; unit: string }

export type SalesReport = {
  range: DateRange
  warehouses: Array<ReportWarehouse>
  summary: SalesTotals
  byDay: Array<SalesRow>
  byProduct: Array<ProductSalesRow>
  byCustomer: Array<SalesRow>
  /** Mostrador, Tienda or Reparto. */
  byChannel: Array<SalesRow>
  byWarehouse: Array<SalesRow>
}

export type SalesDimension =
  'day' | 'product' | 'customer' | 'channel' | 'warehouse'

export type CashCutRow = {
  sessionId: string
  warehouseId: string
  warehouseName: string
  status: 'open' | 'closed'
  openedAt: Date
  closedAt: Date | null
  openedByName: string
  closedByName: string | null
  openingCents: number
  salesCents: number
  entriesCents: number
  /** Cash taken out, as a positive amount. */
  withdrawalsCents: number
  /**
   * Net rider shortage (negative) or surplus (positive) posted to the drawer.
   * Sales are valued at the sold value, so this is the fourth term of
   * expected = opening + sales + entries + riderDifference − withdrawals.
   */
  riderDifferenceCents: number
  /** Stored at close; running value while the drawer is open. */
  expectedCents: number
  countedCents: number | null
  /** Counted − expected; null while open. */
  differenceCents: number | null
}

export type CashCutTotals = {
  sessions: number
  salesCents: number
  expectedCents: number
  /** Closed sessions only. */
  countedCents: number
  differenceCents: number
}

/** Shortage and surplus of the deliveries one rider settled in the period. */
export type RiderShortfallRow = {
  riderId: string
  riderName: string
  warehouseId: string
  warehouseName: string
  /** Settled deliveries that came out short or over. */
  deliveries: number
  /** Cash missing, as a positive amount. */
  shortfallCents: number
  /** Cash over, as a positive amount. */
  surplusCents: number
  /** Surplus − shortfall: negative = the rider owes the drawer. */
  netCents: number
}

export type CashCuts = {
  range: DateRange
  warehouses: Array<ReportWarehouse>
  rows: Array<CashCutRow>
  totals: CashCutTotals
  /** "Faltantes de reparto": net shortfall by rider for the period and scope. */
  riderShortfalls: Array<RiderShortfallRow>
}

export type LowStockRow = {
  warehouseId: string
  warehouseName: string
  productId: string
  name: string
  sku: string
  unit: string
  available: number
  minimum: number
  missing: number
}

export type LotAlertRow = {
  lotId: string
  warehouseId: string
  warehouseName: string
  productId: string
  name: string
  sku: string
  unit: string
  lotCode: string
  expiresOn: string
  /** Negative once expired. */
  daysLeft: number
  onHand: number
  /** Units held by open orders. */
  reserved: number
  /** On-hand units at the lot's own unit cost, rounded once. */
  valueCents: number
}

export type StockAlerts = {
  warehouses: Array<ReportWarehouse>
  expiringDays: number
  lowStock: Array<LowStockRow>
  expiring: Array<LotAlertRow>
  expired: Array<LotAlertRow>
}

export type ReportTab = 'ventas' | 'cajas' | 'inventario'
