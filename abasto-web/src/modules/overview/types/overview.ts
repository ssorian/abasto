/** What Inicio shows. Money fields exist only for warehouses the actor manages. */

export type WarehouseOverview = {
  id: string
  name: string
  /** Reservado or Preparado orders still holding stock. */
  openOrders: number
  /** Open orders whose reservation ends today. */
  expiringTodayOrders: number
  pickedUpToday: number
  drawerOpen: boolean
  belowMinimum: number
  /** Lots with stock that expire within the next 7 days. */
  expiringLots: number
  salesCents?: number
  marginCents?: number
}

export type OverviewTotals = {
  openOrders: number
  expiringTodayOrders: number
  pickedUpToday: number
  drawersOpen: number
  belowMinimum: number
  expiringLots: number
  salesCents?: number
  marginCents?: number
}

export type LowStockItem = {
  warehouseName: string
  name: string
  unit: string
  available: number
  minimum: number
}

export type ExpiringItem = {
  warehouseName: string
  name: string
  unit: string
  lotCode: string
  expiresOn: string
  daysLeft: number
  onHand: number
}

export type Overview = {
  /** Business day (YYYY-MM-DD). */
  today: string
  warehouses: Array<WarehouseOverview>
  totals: OverviewTotals
  /** Owner only; null for everyone else. */
  pendingAuthorizations: number | null
  /** Overdue credit across the company; owner and managers only. */
  overdueCents: number | null
  lowStock: Array<LowStockItem>
  expiring: Array<ExpiringItem>
}
