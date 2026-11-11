import { ClientError, unwrap } from '#/lib/boundary'
import { defaultNonMovingDays } from '#/modules/executive/lib/search'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import { periodOf } from '#/modules/reports/lib/search'
import { ownerDashboardFn } from '#/modules/reports/server/owner-reports'
import type { OwnerDashboard } from '#/modules/reports/types/owner-dashboard'

export type OwnerReportsLoad =
  { allowed: false } | ({ allowed: true } & OwnerDashboard)

/**
 * Loads the owner dashboard in one request. Only the route calls it, for the
 * owner; the services behind it refuse anyone else on the server.
 */
export async function loadOwnerReports(
  search: ExecutiveSearch,
): Promise<OwnerReportsLoad> {
  try {
    const dashboard = unwrap(
      await ownerDashboardFn({
        data: {
          period: periodOf(search),
          warehouseId: search.almacen,
          supplierId: search.proveedor,
          days: search.sinventa ?? defaultNonMovingDays,
        },
      }),
    )
    return { allowed: true, ...dashboard }
  } catch (error) {
    if (error instanceof ClientError && error.code === 'forbidden') {
      return { allowed: false }
    }
    throw error
  }
}
