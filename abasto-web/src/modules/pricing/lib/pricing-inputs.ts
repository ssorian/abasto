import { z } from 'zod'

const id = z.string().min(1)
const cents = z.number().int()

export const pricingOverviewInput = z.object({ warehouseId: id.optional() })

export const setPricesInput = z.object({
  warehouseId: id,
  prices: z.array(z.object({ presentationId: id, priceCents: cents })),
  reason: z.string().optional(),
})

export const historyInput = z.object({ warehouseId: id, presentationId: id })
