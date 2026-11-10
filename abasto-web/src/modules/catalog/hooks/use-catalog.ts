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
import type { ProductPatch } from '#/modules/catalog/services/products'
import type { CatalogImportProduct } from '#/modules/product-import/lib/import-types'

const messageOf = (failure: unknown) =>
  failure instanceof ClientError ? failure.message : genericErrorMessage

/**
 * Write actions of Catálogo. Each one resolves to whether it succeeded; server
 * errors (AppError messages) are shown as toasts and the page data is reloaded.
 */
export function useCatalogActions() {
  const router = useRouter()

  // `sync: true` makes the invalidate wait for the reloaded loader data; the
  // default revalidates in the background and resolves with the old data.
  async function run(action: () => Promise<Result<unknown>>, success: string) {
    try {
      unwrap(await action())
      await router.invalidate({ sync: true })
      toast.success(success)
      return true
    } catch (failure) {
      toast.error(messageOf(failure))
      return false
    }
  }

  return {
    /** Creating sends the product and its presentations in one atomic call. */
    saveProduct: (
      productId: string | undefined,
      draft: ProductDraft,
      presentations?: { rows: Array<PresentationDraft>; defaultKey: string },
    ) =>
      run(
        () =>
          productId
            ? updateProductFn({
                data: { id: productId, patch: productPatchFromDraft(draft) },
              })
            : createProductFn({
                data: productInputFromDraft(
                  draft,
                  presentations?.rows,
                  presentations?.defaultKey,
                ),
              }),
        'Producto guardado.',
      ),
    /**
     * Saves only the supplier amounts of a product. Resolves to the error
     * message (shown by the caller in its dialog) or null on success. Shows no
     * toast: the Prices dialog announces what it saved in one message.
     */
    savePieceCost: async (
      productId: string,
      patch: Pick<
        ProductPatch,
        'listPricePerPiece' | 'fixedDiscountPerPiece' | 'promotionPerPiece'
      >,
    ): Promise<string | null> => {
      try {
        unwrap(await updateProductFn({ data: { id: productId, patch } }))
        await router.invalidate({ sync: true })
        return null
      } catch (failure) {
        return messageOf(failure)
      }
    },
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
      await router.invalidate({ sync: true })
      if (created)
        toast.success(`Importación CSV: ${created} productos nuevos.`)
    },
  }
}
