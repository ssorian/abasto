import { z } from 'zod'

const id = z.string().min(1)
const cents = z.number().int()

export const pricingOverviewInput = z.object({ warehouseId: id.optional() })

export const setPricesInput = z.object({
  warehouseId: id,
  prices: z.array(z.object({ presentationId: id, priceCents: cents })),
  reason: z.string().optional(),
})

export const bulkChangeInput = z.object({
  warehouseIds: z.union([z.literal('all'), z.array(id)]),
  supplierId: id.optional(),
  category: z.string().optional(),
  productIds: z.array(id).optional(),
  change: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('percent'), bps: cents }),
    z.object({ kind: z.literal('fixed'), cents }),
  ]),
  reason: z.string().optional(),
})

export const marginInput = z.object({ productId: id, marginBps: cents })

export const historyInput = z.object({ warehouseId: id, presentationId: id })
