import type { SupplierOrderSummary } from '#/modules/inventory/services/supplier-order-reads'
import type {
  CashCuts,
  ReportWarehouse,
  SalesReport,
  StockAlerts,
} from '#/modules/reports/types/reports'

/** Everything the manager dashboard shows for one of their warehouses. */
export type ManagerDashboard = {
  warehouse: ReportWarehouse
  sales: SalesReport
  /** The comparison period: see `comparisonRange`. */
  previousSales: SalesReport
  cash: CashCuts
  stock: StockAlerts
  /** Supplier orders still to receive (status Pedido). */
  pendingOrders: Array<SupplierOrderSummary>
}
