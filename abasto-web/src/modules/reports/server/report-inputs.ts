import { z } from 'zod'

const period = z.object({
  preset: z.enum(['today', '7', '30', 'custom']),
  from: z.string().optional(),
  to: z.string().optional(),
})

/** Period plus an optional single-warehouse filter; the service checks permissions. */
export const periodReportInput = z.object({
  period,
  warehouseId: z.string().min(1).optional(),
})

export const stockAlertsInput = z.object({
  warehouseId: z.string().min(1).optional(),
  expiringDays: z.number().optional(),
})
