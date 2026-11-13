import { z } from 'zod'
import {
  purchaseStatuses,
  returnResolutions,
} from '#/modules/inventory/db/schema'
import { lossCategoryValues } from '#/modules/inventory/lib/loss-categories'

const id = z.string().min(1)
const whole = z.number().int()

export const overviewInput = z.object({ warehouseId: id.optional() })

export const standardPricesInput = z.object({ warehouseId: id })

export const warehouseStockInput = z.object({ warehouseId: id })

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
    }),
  ),
  /** Open "Por reponer" balances of the supplier closed "a lo chino" by this order. */
  discounts: z.array(z.object({ pendingId: id })).optional(),
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
      missingBoxes: whole,
      damagedBoxes: whole,
      expiresOn: z.string().optional(),
      noExpiry: z.boolean().optional(),
      listPricePerPiece: z.number().optional(),
    }),
  ),
  updateCatalogPrices: z.boolean().optional(),
  extras: z
    .array(
      z.object({
        productId: id,
        boxes: z.number(),
        listPricePerPiece: z.number().optional(),
        expiresOn: z.string().optional(),
        noExpiry: z.boolean().optional(),
      }),
    )
    .optional(),
  replacements: z
    .array(
      z.object({
        pendingId: id,
        boxes: whole,
        expiresOn: z.string().optional(),
        noExpiry: z.boolean().optional(),
      }),
    )
    .optional(),
  confirmExpired: z.boolean().optional(),
})

export const pendingsInput = z.object({ supplierId: id.optional() })

export const scrapInput = z.object({ pendingId: id, boxes: whole })

export const returnInput = z.object({
  pendingId: id,
  boxes: whole,
  resolution: z.enum(returnResolutions),
  creditCents: whole.optional(),
})
