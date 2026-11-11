import { AppError } from '#/lib/errors'
import type { Actor } from '#/modules/access/lib/policy'
import {
  getInventoryValue,
  getNonMovingCapital,
} from '#/modules/executive/services/inventory'
import {
  getMarginReport,
  getWarehouseRanking,
} from '#/modules/executive/services/profitability'
import { previousRange } from '#/modules/reports/lib/manager-chart-data'
import { getCashCuts } from '#/modules/reports/services/cash-cuts'
import {
  managedWarehouses,
  periodRange,
  requireOwner,
} from '#/modules/reports/services/report-scope'
import { listReportSuppliers } from '#/modules/reports/services/report-suppliers'
import { getSalesReport } from '#/modules/reports/services/sales-report'
import { getStockAlerts } from '#/modules/reports/services/stock-alerts'
import type { OwnerDashboard } from '#/modules/reports/types/owner-dashboard'
import type { PeriodInput } from '#/modules/reports/types/reports'

/**
 * Everything the owner dashboard shows, read in one go: one actor check, one
 * filter lookup and every report concurrently (the previous-period sales no
 * longer wait for the ranking, since both derive it from the same range).
 * A refused period or warehouse comes back as `error` next to the filters.
 */
export async function getOwnerDashboard(
  actor: Actor,
  input: {
    period: PeriodInput
    warehouseId?: string
    supplierId?: string
    /** Window of the non-moving report; the service accepts 30, 60 or 90. */
    nonMovingDays?: number
  },
): Promise<OwnerDashboard> {
  requireOwner(actor)
  const [warehouses, suppliers] = await Promise.all([
    managedWarehouses(actor),
    listReportSuppliers(),
  ])
  const options = { warehouses, suppliers }
  const warehouseIds = input.warehouseId ? [input.warehouseId] : undefined
  const filters = { warehouseIds, supplierId: input.supplierId }
  try {
    const period = input.period
    const before = previousRange(periodRange(period))
    const [
      margin,
      ranking,
      inventory,
      nonMoving,
      sales,
      previousSales,
      cashCuts,
      stockAlerts,
    ] = await Promise.all([
      getMarginReport(actor, { period, ...filters }),
      getWarehouseRanking(actor, { period, ...filters }),
      getInventoryValue(actor, filters),
      getNonMovingCapital(actor, { days: input.nonMovingDays, ...filters }),
      getSalesReport(actor, { period, ...filters }),
      getSalesReport(actor, {
        period: { preset: 'custom', from: before.from, to: before.to },
        ...filters,
      }),
      // A cash session mixes suppliers: cash cuts follow the warehouse only.
      getCashCuts(actor, { period, warehouseIds }),
      getStockAlerts(actor, filters),
    ])
    return {
      ...options,
      data: {
        margin,
        ranking,
        inventory,
        nonMoving,
        sales,
        previousSales,
        cashCuts,
        stockAlerts,
      },
    }
  } catch (error) {
    // Bad dates, or a warehouse id that is not one: show it next to the filters.
    if (
      error instanceof AppError &&
      (error.code === 'invalid' || error.code === 'forbidden')
    ) {
      return { ...options, error: error.message }
    }
    throw error
  }
}
