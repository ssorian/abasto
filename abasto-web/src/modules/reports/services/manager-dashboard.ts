import { AppError } from '#/lib/errors'
import type { Actor } from '#/modules/access/lib/policy'
import { listSupplierOrders } from '#/modules/inventory/services/supplier-order-reads'
import { previousRange } from '#/modules/reports/lib/manager-chart-data'
import { getCashCuts } from '#/modules/reports/services/cash-cuts'
import {
  managedWarehouses,
  reportWarehouses,
} from '#/modules/reports/services/report-scope'
import { getSalesReport } from '#/modules/reports/services/sales-report'
import { getStockAlerts } from '#/modules/reports/services/stock-alerts'
import type { ManagerDashboard } from '#/modules/reports/types/manager-dashboard'
import type { PeriodInput } from '#/modules/reports/types/reports'

/**
 * Everything the manager dashboard shows for ONE warehouse: the requested one
 * (it must be managed by the actor) or the first of theirs. Built only from
 * the report services, so each figure keeps its own scope check.
 */
export async function getManagerDashboard(
  actor: Actor,
  input: { period: PeriodInput; warehouseId?: string },
): Promise<ManagerDashboard> {
  const managed = await managedWarehouses(actor)
  const requested = input.warehouseId ?? managed.at(0)?.id
  const warehouse = requested
    ? (await reportWarehouses(actor, [requested])).at(0)
    : undefined
  if (!warehouse) {
    throw new AppError('not_found', 'Aún no hay almacenes para reportar.')
  }
  const warehouseIds = [warehouse.id]
  const [sales, cash, stock, pendingOrders] = await Promise.all([
    getSalesReport(actor, { period: input.period, warehouseIds }),
    getCashCuts(actor, { period: input.period, warehouseIds }),
    getStockAlerts(actor, { warehouseIds }),
    listSupplierOrders(actor, {
      warehouseId: warehouse.id,
      status: 'Pedido',
    }),
  ])
  const before = previousRange(sales.range)
  const previous = await getSalesReport(actor, {
    period: { preset: 'custom', from: before.from, to: before.to },
    warehouseIds,
  })
  return {
    warehouse,
    sales,
    previousSales: previous,
    cash,
    stock,
    pendingOrders,
  }
}
