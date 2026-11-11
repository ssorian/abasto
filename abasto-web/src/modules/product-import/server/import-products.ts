import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { productInput } from '#/modules/catalog/schemas/product-schema'
import { importProducts } from '#/modules/product-import/services/import-products'
import type { ImportProductRow } from '#/modules/product-import/services/import-products'

const importInput = z.object({
  warehouseId: z.string().min(1),
  rows: z.array(
    z.object({
      product: productInput,
      priceCents: z.number(),
      minimum: z.number(),
    }),
  ),
})

/** Owner-only: creates the CSV products and saves their price and minimum in one warehouse. */
export const importProductsFn = createServerFn({ method: 'POST' })
  .validator(
    (data: { warehouseId: string; rows: Array<ImportProductRow> }) => data,
  )
  .handler(({ data }) =>
    runWithActor((actor) =>
      importProducts(actor, parseInput(importInput, data)),
    ),
  )
