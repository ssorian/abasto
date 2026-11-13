import { z } from 'zod'

import { presentationSetInput } from '#/modules/catalog/schemas/presentations-schema'

/** Shape of the untrusted server-function input; the services own the rules. */
const productFields = z.object({
  name: z.string(),
  sku: z.string(),
  category: z.string(),
  unit: z.string(),
  brand: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().nullish(),
  supplierId: z.string().nullish(),
  published: z.boolean().optional(),
  supplierCode: z.string().optional(),
  listPricePerPiece: z.number().optional(),
  fixedDiscountPerPiece: z.number().optional(),
  promotionPerPiece: z.number().optional(),
})

export const productInput = productFields.extend(presentationSetInput.shape)
/** Creation from the catalog dialog: the cost is required, the price optional. */
export const newProductInput = productInput.extend({
  listPricePerPiece: z.number(),
  price: z
    .object({ warehouseId: z.string().min(1), priceCents: z.number() })
    .optional(),
})
export const productPatchInput = productFields.omit({ unit: true }).partial()
export const idInput = z.string()
/** Only the supplier amounts; any other key is dropped. */
export const pieceCostInput = productFields.pick({
  listPricePerPiece: true,
  fixedDiscountPerPiece: true,
  promotionPerPiece: true,
})

export const supplierInput = z.object({
  name: z.string(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})
export const supplierPatchInput = supplierInput
  .partial()
  .extend({ active: z.boolean().optional() })
