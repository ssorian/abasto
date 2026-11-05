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
})

export const productInput = productFields.extend(presentationSetInput.shape)
export const productPatchInput = productFields.omit({ unit: true }).partial()
export const idInput = z.string()

export const supplierInput = z.object({
  name: z.string(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})
export const supplierPatchInput = supplierInput
  .partial()
  .extend({ active: z.boolean().optional() })
