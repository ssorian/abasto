import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { presentationSetInput } from '#/modules/catalog/schemas/presentations-schema'
import {
  idInput,
  productInput,
  productPatchInput,
  supplierInput,
  supplierPatchInput,
} from '#/modules/catalog/schemas/product-schema'
import { savePresentations } from '#/modules/catalog/services/presentations'
import type { PresentationSet } from '#/modules/catalog/services/presentation-rules'
import {
  createProduct,
  listProducts,
  updateProduct,
} from '#/modules/catalog/services/products'
import type {
  ProductInput,
  ProductPatch,
} from '#/modules/catalog/services/products'
import {
  createSupplier,
  listSuppliers,
  updateSupplier,
} from '#/modules/catalog/services/suppliers'
import type {
  SupplierInput,
  SupplierPatch,
} from '#/modules/catalog/services/suppliers'

export const listProductsFn = createServerFn({ method: 'GET' }).handler(() =>
  runWithActor((actor) => listProducts(actor)),
)

export const listSuppliersFn = createServerFn({ method: 'GET' }).handler(() =>
  runWithActor((actor) => listSuppliers(actor)),
)

export const createProductFn = createServerFn({ method: 'POST' })
  .validator((data: ProductInput) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      createProduct(actor, parseInput(productInput, data)),
    ),
  )

export const updateProductFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string; patch: ProductPatch }) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      updateProduct(
        actor,
        parseInput(idInput, data.id),
        parseInput(productPatchInput, data.patch),
      ),
    ),
  )

export const savePresentationsFn = createServerFn({ method: 'POST' })
  .validator((data: { productId: string; set: PresentationSet }) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      savePresentations(
        actor,
        parseInput(idInput, data.productId),
        parseInput(presentationSetInput, data.set),
      ),
    ),
  )

export const createSupplierFn = createServerFn({ method: 'POST' })
  .validator((data: SupplierInput) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      createSupplier(actor, parseInput(supplierInput, data)),
    ),
  )

export const updateSupplierFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string; patch: SupplierPatch }) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      updateSupplier(
        actor,
        parseInput(idInput, data.id),
        parseInput(supplierPatchInput, data.patch),
      ),
    ),
  )
