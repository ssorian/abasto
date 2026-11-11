import { useActionRunner } from '#/hooks/use-action-runner'
import { toast } from 'sonner'

import { useInlineAction } from '#/modules/catalog/hooks/use-inline-action'
import { importRowFromCsv } from '#/modules/catalog/lib/catalog-import'
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
  savePieceCostFn,
  updateProductFn,
  updateProductWithPresentationsFn,
  updateSupplierFn,
} from '#/modules/catalog/server/catalog'
import type { ProductPatch } from '#/modules/catalog/services/products'
import type { CatalogImportProduct } from '#/modules/product-import/lib/import-types'
import { importProductsFn } from '#/modules/product-import/server/import-products'

/**
 * Write actions of Catálogo, all through the shared runner: lists refresh
 * after every save and a Spanish success toast follows. The save actions that
 * live in a dialog resolve to the server message when they fail (null on
 * success) so the dialog shows it next to its fields and stays open.
 */
export function useCatalogActions() {
  const inline = useInlineAction()
  const run = useActionRunner()

  return {
    /**
     * One save for the product and its presentations, atomic in both cases:
     * creating inserts them together, editing updates both in one transaction.
     */
    saveProduct: (
      productId: string | undefined,
      draft: ProductDraft,
      presentations?: { rows: Array<PresentationDraft>; defaultKey: string },
    ) =>
      inline(
        () =>
          productId
            ? updateProductWithPresentationsFn({
                data: {
                  id: productId,
                  patch: productPatchFromDraft(draft),
                  set: presentationSetFromDrafts(
                    presentations?.rows ?? [],
                    presentations?.defaultKey ?? '',
                  ),
                },
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
    savePieceCost: (
      productId: string,
      patch: Pick<
        ProductPatch,
        'listPricePerPiece' | 'fixedDiscountPerPiece' | 'promotionPerPiece'
      >,
    ) =>
      inline(() => savePieceCostFn({ data: { id: productId, cost: patch } })),
    setPublished: (productId: string, published: boolean) =>
      run(
        () =>
          updateProductFn({ data: { id: productId, patch: { published } } }),
        published ? 'Producto publicado.' : 'Producto pausado.',
      ),
    saveSupplier: (supplierId: string | undefined, draft: SupplierDraft) =>
      inline(
        () =>
          supplierId
            ? updateSupplierFn({ data: { id: supplierId, patch: draft } })
            : createSupplierFn({ data: draft }),
        'Proveedor guardado.',
      ),
    /**
     * Creates each CSV row as a product and saves its sale price and minimum
     * stock in the warehouse; reports the rows the server rejected.
     */
    importProducts: (
      warehouse: { id: string; name: string },
      rows: ReadonlyArray<CatalogImportProduct>,
    ) =>
      run(
        () =>
          importProductsFn({
            data: {
              warehouseId: warehouse.id,
              rows: rows.map(importRowFromCsv),
            },
          }),
        {
          onSuccess: (results) => {
            for (const { sku, error } of results) {
              if (error) toast.error(`${sku}: ${error}`)
            }
            const created = results.filter(({ error }) => !error).length
            if (created) {
              toast.success(
                `Importación CSV: ${created} productos nuevos con precio y mínimo en ${warehouse.name}.`,
              )
            }
          },
        },
      ),
  }
}
