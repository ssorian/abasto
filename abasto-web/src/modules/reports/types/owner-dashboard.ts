import type {
  InventoryValue,
  NonMovingCapital,
} from '#/modules/executive/types/inventory'
import type {
  MarginReport,
  WarehouseRanking,
} from '#/modules/executive/types/profitability'
import type {
  CashCuts,
  ReportSupplier,
  ReportWarehouse,
  SalesReport,
  StockAlerts,
} from '#/modules/reports/types/reports'

/** Every report of the owner dashboard for one set of filters. */
export type OwnerDashboardData = {
  margin: MarginReport
  ranking: WarehouseRanking
  inventory: InventoryValue
  nonMoving: NonMovingCapital
  sales: SalesReport
  previousSales: SalesReport
  cashCuts: CashCuts
  stockAlerts: StockAlerts
}

export type OwnerDashboard = {
  /** Every warehouse and supplier, for the filter selects. */
  warehouses: Array<ReportWarehouse>
  suppliers: Array<ReportSupplier>
  /** Missing when the period or filters were refused; `error` says why. */
  data?: OwnerDashboardData
  error?: string
}
