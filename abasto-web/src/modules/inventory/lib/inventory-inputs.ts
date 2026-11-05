import { z } from 'zod'
import { lossCategoryValues } from '#/modules/inventory/lib/loss-categories'

const id = z.string().min(1)
const whole = z.number().int()

export const overviewInput = z.object({ warehouseId: id.optional() })

export const purchaseInput = z.object({
  supplierId: id,
  warehouseId: id,
  reference: z.string().optional(),
  purchasedOn: z.string(),
  lines: z.array(
    z.object({
      productId: id,
      quantity: whole,
      totalCostCents: whole,
      lotCode: z.string().optional(),
      expiresOn: z.string().optional(),
    }),
  ),
})

export const suggestionsInput = z.object({ purchaseId: id })

export const applyPricesInput = z.object({
  purchaseId: id,
  prices: z.array(z.object({ presentationId: id, priceCents: whole })),
})

export const minimumInput = z.object({
  productId: id,
  warehouseId: id,
  minimum: whole,
})

export const adjustInput = z.object({
  lotId: id,
  quantity: whole,
  reason: z.string(),
})

export const lossInput = z.object({
  lotId: id,
  quantity: whole,
  category: z.enum(lossCategoryValues),
  reason: z.string(),
})

export const countInput = z.object({
  productId: id,
  warehouseId: id,
  countedQuantity: whole,
  note: z.string().optional(),
})
