import { ClientError, unwrap } from '#/lib/boundary'
import type { ManagerReportsSearch } from '#/modules/reports/lib/manager-search'
import { periodOf } from '#/modules/reports/lib/search'
import { managerDashboardFn } from '#/modules/reports/server/manager-reports'
import { reportScopeFn } from '#/modules/reports/server/reports'
import type { ManagerDashboard } from '#/modules/reports/types/manager-dashboard'
import type { ReportWarehouse } from '#/modules/reports/types/reports'

export type { ManagerDashboard }

export type ManagerReportsLoad =
  | { allowed: false }
  | {
      allowed: true
      /** Only the warehouses the actor manages; feeds the selector. */
      warehouses: Array<ReportWarehouse>
      /** Missing when the filters were refused; `error` says why. */
      dashboard?: ManagerDashboard
      error?: string
    }

/** Loads the dashboard of one warehouse; anyone who manages none gets `allowed: false`. */
export async function loadManagerReports(
  search: ManagerReportsSearch,
): Promise<ManagerReportsLoad> {
  const scope = await reportScopeFn()
  if (!scope.ok) {
    if (scope.code === 'forbidden') return { allowed: false }
    throw new ClientError(scope.code, scope.message)
  }
  try {
    const dashboard = unwrap(
      await managerDashboardFn({
        data: { period: periodOf(search), warehouseId: search.almacen },
      }),
    )
    return { allowed: true, warehouses: scope.data, dashboard }
  } catch (error) {
    // Bad dates or a warehouse that is not theirs: show it next to the filters.
    if (
      error instanceof ClientError &&
      (error.code === 'invalid' || error.code === 'forbidden')
    ) {
      return { allowed: true, warehouses: scope.data, error: error.message }
    }
    throw error
  }
}
