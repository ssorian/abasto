import { z } from 'zod'
import { purchaseStatuses } from '#/modules/inventory/db/schema'
import { lossCategoryValues } from '#/modules/inventory/lib/loss-categories'

const id = z.string().min(1)
const whole = z.number().int()

export const overviewInput = z.object({ warehouseId: id.optional() })

export const standardPricesInput = z.object({ warehouseId: id })

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

export const supplierOrderInput = z.object({
  supplierId: id,
  warehouseId: id,
  expectedOn: z.string().optional(),
  reference: z.string().optional(),
  lines: z.array(
    z.object({
      productId: id,
      boxes: whole,
      grossCostCents: z.number(),
    }),
  ),
})

export const orderIdInput = z.object({ purchaseId: id })

export const supplierOrdersInput = z.object({
  warehouseId: id,
  status: z.enum(purchaseStatuses).optional(),
})

export const receiveOrderInput = z.object({
  purchaseId: id,
  lines: z.array(
    z.object({
      lineId: id,
      goodBoxes: whole,
      damagedBoxes: whole,
      lotCode: z.string().optional(),
      expiresOn: z.string().optional(),
    }),
  ),
  replacements: z
    .array(
      z.object({
        productId: id,
        boxes: whole,
        lotCode: z.string().optional(),
        expiresOn: z.string().optional(),
      }),
    )
    .optional(),
})

export const pendingsInput = z.object({ supplierId: id.optional() })

export const writeOffInput = z.object({
  supplierId: id,
  productId: id,
  boxes: whole,
})
