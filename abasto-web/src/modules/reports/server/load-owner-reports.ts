import { ClientError, unwrap } from '#/lib/boundary'
import { defaultNonMovingDays } from '#/modules/executive/lib/search'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import {
  inventoryValueFn,
  marginReportFn,
  nonMovingCapitalFn,
  warehouseRankingFn,
} from '#/modules/executive/server/executive'
import type {
  InventoryValue,
  NonMovingCapital,
} from '#/modules/executive/types/inventory'
import type {
  MarginReport,
  WarehouseRanking,
} from '#/modules/executive/types/profitability'
import { periodOf } from '#/modules/reports/lib/search'
import {
  cashCutsFn,
  reportScopeFn,
  reportSuppliersFn,
  salesReportFn,
  stockAlertsFn,
} from '#/modules/reports/server/reports'
import type {
  CashCuts,
  ReportSupplier,
  ReportWarehouse,
  SalesReport,
  StockAlerts,
} from '#/modules/reports/types/reports'

export type OwnerReportsLoad =
  | { allowed: false }
  | {
      allowed: true
      /** Every warehouse and supplier, for the filter selects. */
      warehouses: Array<ReportWarehouse>
      suppliers: Array<ReportSupplier>
      /** Missing when the period was refused (bad dates); `error` says why. */
      data?: {
        margin: MarginReport
        ranking: WarehouseRanking
        inventory: InventoryValue
        nonMoving: NonMovingCapital
        sales: SalesReport
        previousSales: SalesReport
        cashCuts: CashCuts
        stockAlerts: StockAlerts
      }
      error?: string
    }

/**
 * Loads the owner dashboard. Only the route calls it, for the owner; the
 * executive services behind it refuse anyone else on the server.
 */
export async function loadOwnerReports(
  search: ExecutiveSearch,
): Promise<OwnerReportsLoad> {
  let options: {
    warehouses: Array<ReportWarehouse>
    suppliers: Array<ReportSupplier>
  }
  try {
    const [scope, suppliers] = await Promise.all([
      reportScopeFn(),
      reportSuppliersFn(),
    ])
    options = { warehouses: unwrap(scope), suppliers: unwrap(suppliers) }
  } catch (error) {
    if (error instanceof ClientError && error.code === 'forbidden') {
      return { allowed: false }
    }
    throw error
  }
  const period = periodOf(search)
  const filters = { warehouseId: search.almacen, supplierId: search.proveedor }
  try {
    const [
      margin,
      ranking,
      inventory,
      nonMoving,
      sales,
      cashCuts,
      stockAlerts,
    ] = await Promise.all([
      marginReportFn({ data: { period, ...filters } }),
      warehouseRankingFn({ data: { period, ...filters } }),
      inventoryValueFn({ data: filters }),
      nonMovingCapitalFn({
        data: { days: search.sinventa ?? defaultNonMovingDays, ...filters },
      }),
      salesReportFn({ data: { period, ...filters } }),
      // A cash session mixes suppliers: cash cuts follow the warehouse only.
      cashCutsFn({ data: { period, warehouseId: filters.warehouseId } }),
      stockAlertsFn({ data: filters }),
    ])
    const rankingData = unwrap(ranking)
    // The ranking already resolved the previous range on the server clock.
    const previousSales = unwrap(
      await salesReportFn({
        data: {
          period: {
            preset: 'custom',
            from: rankingData.previousRange.from,
            to: rankingData.previousRange.to,
          },
          ...filters,
        },
      }),
    )
    return {
      allowed: true,
      ...options,
      data: {
        margin: unwrap(margin),
        ranking: rankingData,
        inventory: unwrap(inventory),
        nonMoving: unwrap(nonMoving),
        sales: unwrap(sales),
        previousSales,
        cashCuts: unwrap(cashCuts),
        stockAlerts: unwrap(stockAlerts),
      },
    }
  } catch (error) {
    // Bad dates, or a warehouse id that is not one: show it next to the filters.
    if (
      error instanceof ClientError &&
      (error.code === 'invalid' || error.code === 'forbidden')
    ) {
      return { allowed: true, ...options, error: error.message }
    }
    throw error
  }
}
