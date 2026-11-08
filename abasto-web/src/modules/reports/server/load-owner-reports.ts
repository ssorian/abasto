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
  salesReportFn,
  stockAlertsFn,
} from '#/modules/reports/server/reports'
import type {
  CashCuts,
  SalesReport,
  StockAlerts,
} from '#/modules/reports/types/reports'

export type OwnerReportsLoad =
  | { allowed: false }
  | {
      allowed: true
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
  const period = periodOf(search)
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
      marginReportFn({ data: { period } }),
      warehouseRankingFn({ data: { period } }),
      inventoryValueFn(),
      nonMovingCapitalFn({
        data: { days: search.sinventa ?? defaultNonMovingDays },
      }),
      salesReportFn({ data: { period } }),
      cashCutsFn({ data: { period } }),
      stockAlertsFn({ data: {} }),
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
        },
      }),
    )
    return {
      allowed: true,
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
    if (error instanceof ClientError && error.code === 'forbidden') {
      return { allowed: false }
    }
    if (error instanceof ClientError && error.code === 'invalid') {
      return { allowed: true, error: error.message }
    }
    throw error
  }
}
