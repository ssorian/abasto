import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import { productInputFromImport } from '#/modules/catalog/lib/catalog-import'
import type {
  PresentationDraft,
  ProductDraft,
  SupplierDraft,
} from '#/modules/catalog/lib/catalog-types'
import { presentationSetFromDrafts } from '#/modules/catalog/lib/presentation-draft'
import {
  productInputFromDraft,
  productPatchFromDraft,
} from '#/modules/catalog/lib/product-draft'
import {
  createProductFn,
  createSupplierFn,
  savePresentationsFn,
  updateProductFn,
  updateSupplierFn,
} from '#/modules/catalog/server/catalog'
import type { CatalogImportProduct } from '#/modules/product-import/lib/import-types'

const messageOf = (failure: unknown) =>
  failure instanceof ClientError ? failure.message : genericErrorMessage

/**
 * Write actions of Catálogo. Each one resolves to whether it succeeded; server
 * errors (AppError messages) are shown as toasts and the page data is reloaded.
 */
export function useCatalogActions() {
  const router = useRouter()

  async function run(action: () => Promise<Result<unknown>>, success: string) {
    try {
      unwrap(await action())
      await router.invalidate()
      toast.success(success)
      return true
    } catch (failure) {
      toast.error(messageOf(failure))
      return false
    }
  }

  return {
    saveProduct: (productId: string | undefined, draft: ProductDraft) =>
      run(
        () =>
          productId
            ? updateProductFn({
                data: { id: productId, patch: productPatchFromDraft(draft) },
              })
            : createProductFn({ data: productInputFromDraft(draft) }),
        'Producto guardado.',
      ),
    setPublished: (productId: string, published: boolean) =>
      run(
        () =>
          updateProductFn({ data: { id: productId, patch: { published } } }),
        published ? 'Producto publicado.' : 'Producto pausado.',
      ),
    savePresentations: (
      productId: string,
      rows: ReadonlyArray<PresentationDraft>,
      defaultKey: string,
    ) =>
      run(
        () =>
          savePresentationsFn({
            data: {
              productId,
              set: presentationSetFromDrafts(rows, defaultKey),
            },
          }),
        'Presentaciones actualizadas.',
      ),
    saveSupplier: (supplierId: string | undefined, draft: SupplierDraft) =>
      run(
        () =>
          supplierId
            ? updateSupplierFn({ data: { id: supplierId, patch: draft } })
            : createSupplierFn({ data: draft }),
        'Proveedor guardado.',
      ),
    /** Creates each CSV row as a product; reports the rows the server rejected. */
    async importProducts(rows: ReadonlyArray<CatalogImportProduct>) {
      let created = 0
      for (const row of rows) {
        try {
          unwrap(await createProductFn({ data: productInputFromImport(row) }))
          created += 1
        } catch (failure) {
          toast.error(`${row.sku}: ${messageOf(failure)}`)
        }
      }
      await router.invalidate()
      if (created)
        toast.success(`Importación CSV: ${created} productos nuevos.`)
    },
  }
}
