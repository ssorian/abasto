import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { periodReportInput } from '#/modules/reports/server/report-inputs'
import { getManagerDashboard } from '#/modules/reports/services/manager-dashboard'

/** The manager dashboard of one warehouse (the first of theirs when omitted). */
export const managerDashboardFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => {
      const input = parseInput(periodReportInput, data)
      return getManagerDashboard(actor, {
        period: input.period,
        warehouseId: input.warehouseId,
        supplierId: input.supplierId,
      })
    }),
  )
