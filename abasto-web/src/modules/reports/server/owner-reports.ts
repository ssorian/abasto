import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { periodOnlyInput } from '#/modules/reports/server/report-inputs'
import { getOwnerDashboard } from '#/modules/reports/services/owner-dashboard'
import { z } from 'zod'

const ownerDashboardInput = periodOnlyInput.extend({
  days: z.number().optional(),
})

/** The whole owner dashboard in one request (owner only; refused for anyone else). */
export const ownerDashboardFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => {
      const input = parseInput(ownerDashboardInput, data)
      return getOwnerDashboard(actor, {
        period: input.period,
        warehouseId: input.warehouseId,
        supplierId: input.supplierId,
        nonMovingDays: input.days,
      })
    }),
  )
