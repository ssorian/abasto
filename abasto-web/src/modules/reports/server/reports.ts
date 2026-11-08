import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import {
  periodReportInput,
  stockAlertsInput,
} from '#/modules/reports/server/report-inputs'
import { getCashCuts } from '#/modules/reports/services/cash-cuts'
import { managedWarehouses } from '#/modules/reports/services/report-scope'
import { listReportSuppliers } from '#/modules/reports/services/report-suppliers'
import { getSalesReport } from '#/modules/reports/services/sales-report'
import { getStockAlerts } from '#/modules/reports/services/stock-alerts'

const only = (warehouseId?: string) => (warehouseId ? [warehouseId] : undefined)

/** Warehouses the actor may report on; refuses actors who manage none. */
export const reportScopeFn = createServerFn({ method: 'GET' }).handler(() =>
  runWithActor((actor) => managedWarehouses(actor)),
)

/** Suppliers offered by the report filter; same scope check as the reports. */
export const reportSuppliersFn = createServerFn({ method: 'GET' }).handler(() =>
  runWithActor(async (actor) => {
    await managedWarehouses(actor)
    return listReportSuppliers()
  }),
)

export const salesReportFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => {
      const input = parseInput(periodReportInput, data)
      return getSalesReport(actor, {
        period: input.period,
        warehouseIds: only(input.warehouseId),
        supplierId: input.supplierId,
      })
    }),
  )

export const cashCutsFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => {
      const input = parseInput(periodReportInput, data)
      return getCashCuts(actor, {
        period: input.period,
        warehouseIds: only(input.warehouseId),
      })
    }),
  )

export const stockAlertsFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => {
      const input = parseInput(stockAlertsInput, data)
      return getStockAlerts(actor, {
        warehouseIds: only(input.warehouseId),
        supplierId: input.supplierId,
        expiringDays: input.expiringDays,
      })
    }),
  )
