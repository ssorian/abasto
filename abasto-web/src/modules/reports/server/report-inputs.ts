import { z } from 'zod'

const period = z.object({
  preset: z.enum(['today', '7', '30', 'week', 'month', 'custom']),
  from: z.string().optional(),
  to: z.string().optional(),
  anchor: z.string().optional(),
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

const id = z.string().min(1)

/** Optional warehouse and supplier filters of the owner console; services validate them. */
const ownerFilters = { warehouseId: id.optional(), supplierId: id.optional() }

/** Period plus the optional filters; the owner services refuse anyone else. */
export const periodOnlyInput = z.object({ period, ...ownerFilters })

/** Filters alone, for the inventory value. */
export const inventoryFiltersInput = z.object(ownerFilters)

/** Window of the non-moving stock report (the service accepts 30, 60 or 90) plus filters. */
export const nonMovingInput = z.object({
  days: z.number().optional(),
  ...ownerFilters,
})
