import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import {
  periodReportInput,
  stockAlertsInput,
} from '#/modules/reports/server/report-inputs'
import { getCashCuts } from '#/modules/reports/services/cash-cuts'
import { getReceivablesAging } from '#/modules/reports/services/receivables-aging'
import { managedWarehouses } from '#/modules/reports/services/report-scope'
import { getSalesReport } from '#/modules/reports/services/sales-report'
import { getStockAlerts } from '#/modules/reports/services/stock-alerts'

const only = (warehouseId?: string) => (warehouseId ? [warehouseId] : undefined)

/** Warehouses the actor may report on; refuses actors who manage none. */
export const reportScopeFn = createServerFn({ method: 'GET' }).handler(() =>
  runWithActor((actor) => managedWarehouses(actor)),
)

export const salesReportFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => {
      const input = parseInput(periodReportInput, data)
      return getSalesReport(actor, {
        period: input.period,
        warehouseIds: only(input.warehouseId),
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
        expiringDays: input.expiringDays,
      })
    }),
  )

export const receivablesAgingFn = createServerFn({ method: 'GET' }).handler(
  () => runWithActor((actor) => getReceivablesAging(actor)),
)
