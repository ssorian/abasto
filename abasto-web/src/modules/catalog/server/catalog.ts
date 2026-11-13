import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { presentationSetInput } from '#/modules/catalog/schemas/presentations-schema'
import {
  idInput,
  pieceCostInput,
  newProductInput,
  productPatchInput,
  supplierInput,
  supplierPatchInput,
} from '#/modules/catalog/schemas/product-schema'
import {
  archiveProduct,
  restoreProduct,
} from '#/modules/catalog/services/product-archive'
import { updateProductWithPresentations } from '#/modules/catalog/services/product-edit'
import { savePresentations } from '#/modules/catalog/services/presentations'
import type { PresentationSet } from '#/modules/catalog/services/presentation-rules'
import {
  createProduct,
  listAllProducts,
  listProducts,
  savePieceCost,
  updateProduct,
} from '#/modules/catalog/services/products'
import type {
  NewProductInput,
  PieceCost,
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

/**
 * GET server functions have a stable URL, so a browser may answer a reload
 * after a save from its HTTP cache; reads must always reach the database.
 */
const neverCached = () => setResponseHeader('Cache-Control', 'no-store')

export const listProductsFn = createServerFn({ method: 'GET' }).handler(() => {
  neverCached()
  return runWithActor((actor) => listProducts(actor))
})

/** The whole catalog including archived products; only the Catálogo page uses it. */
export const listCatalogProductsFn = createServerFn({
  method: 'GET',
}).handler(() => {
  neverCached()
  return runWithActor((actor) => listAllProducts(actor))
})

/** Owner only; refused while the product has stock or open work. */
export const archiveProductFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      archiveProduct(actor, parseInput(idInput, data.id)),
    ),
  )

export const restoreProductFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      restoreProduct(actor, parseInput(idInput, data.id)),
    ),
  )

export const listSuppliersFn = createServerFn({ method: 'GET' }).handler(() => {
  neverCached()
  return runWithActor((actor) => listSuppliers(actor))
})

export const createProductFn = createServerFn({ method: 'POST' })
  .validator((data: NewProductInput) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      createProduct(actor, parseInput(newProductInput, data)),
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

/** The single save of the edit dialog: fields and presentations in one transaction. */
export const updateProductWithPresentationsFn = createServerFn({
  method: 'POST',
})
  .validator(
    (data: { id: string; patch: ProductPatch; set: PresentationSet }) => data,
  )
  .handler(({ data }) =>
    runWithActor((actor) =>
      updateProductWithPresentations(actor, parseInput(idInput, data.id), {
        patch: parseInput(productPatchInput, data.patch),
        set: parseInput(presentationSetInput, data.set),
      }),
    ),
  )

/** Supplier amounts only: allowed to the owner and to warehouse managers. */
export const savePieceCostFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string; cost: PieceCost }) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      savePieceCost(
        actor,
        parseInput(idInput, data.id),
        parseInput(pieceCostInput, data.cost),
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
