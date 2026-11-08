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
  supplierId: z.string().min(1).optional(),
})

export const stockAlertsInput = z.object({
  warehouseId: z.string().min(1).optional(),
  supplierId: z.string().min(1).optional(),
  expiringDays: z.number().optional(),
})

/** Period only: the owner console always covers every warehouse. */
export const periodOnlyInput = z.object({ period })

/** Window of the non-moving stock report; the service accepts 30, 60 or 90. */
export const nonMovingInput = z.object({ days: z.number().optional() })
