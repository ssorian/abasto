import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeading } from '#/components/page-heading'
import { CatalogBanner } from '#/modules/catalog/components/catalog-banner'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogCard } from '#/modules/catalog/components/catalog-card'
import { CatalogEmpty } from '#/modules/catalog/components/catalog-empty'
import { CatalogToolbar } from '#/modules/catalog/components/catalog-toolbar'
import { SensitiveOperationDialog } from '#/modules/catalog/forms/sensitive-operation-dialog'
import { PresentationsDialog } from '#/modules/catalog/forms/presentations-dialog'
import { ProductFormDialog } from '#/modules/catalog/forms/product-form-dialog'
import { useCatalog } from '#/modules/catalog/hooks/use-catalog'
import {
  importReferenceProducts,
  productFromImport,
} from '#/modules/catalog/lib/catalog-import'
import { ImportCsvDialog } from '#/modules/product-import/components/import-csv-dialog'
import {
  filterCatalog,
  publicationCounts,
} from '#/modules/catalog/lib/catalog-search'
import { reviewCatalogChange } from '#/modules/catalog/lib/catalog-review'
import { withPresentations } from '#/modules/catalog/lib/presentation-draft'
import { validatePresentations } from '#/modules/catalog/schemas/presentations-schema'
import { validateProductDraft } from '#/modules/catalog/schemas/product-schema'

import type { CatalogReview } from '#/modules/catalog/lib/catalog-review'
import type { ImportResult } from '#/modules/product-import/lib/import-types'
import type {
  CatalogProduct,
  PresentationDraft,
  ProductDraft,
} from '#/modules/catalog/lib/catalog-types'

/** Signed-in demo user who files the sensitive operations. */
const REQUESTER = 'Mariana Ruiz'

/** A catalog change waiting for its written reason. */
type PendingChange = {
  product: CatalogProduct
  message: string
  review: CatalogReview
}

/** Editor target: `{}` creates a product, `{ productId }` edits one. */
type Editor = { productId?: string } | undefined

export function CatalogPage() {
  const { products, upsertProduct } = useCatalog()
  const [importOpen, setImportOpen] = useState(false)

  function applyImport(result: ImportResult) {
    if (result.mode !== 'catalog') return
    for (const row of result.products)
      upsertProduct(
        productFromImport(
          row,
          `PROD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        ),
      )
    toast.success('Importación CSV registrada.')
  }
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Editor>()
  const [presentationsId, setPresentationsId] = useState<string>()
  const [pending, setPending] = useState<PendingChange>()

  const editing = products.find(({ id }) => id === editor?.productId)
  const presenting = products.find(({ id }) => id === presentationsId)
  const visible = filterCatalog(products, query)
  const { published, paused } = publicationCounts(products)

  const store = (product: CatalogProduct, message: string) => {
    upsertProduct(product)
    toast.success(message)
    setPending(undefined)
    setEditor(undefined)
    setPresentationsId(undefined)
  }

  /** Registers a change, asking for a reason first when it is sensitive. */
  const commit = (product: CatalogProduct, message: string) => {
    const review = reviewCatalogChange(
      products.find(({ id }) => id === product.id),
      product,
    )
    if (!review) {
      toast.error('No hay cambios que registrar.')
      return
    }
    if (review.needsReason) {
      setPending({ product, message, review })
      return
    }
    store(product, message)
  }

  const submitProduct = (draft: ProductDraft) => {
    const result = validateProductDraft(
      draft,
      products,
      editing,
      () => `PROD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    )
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    commit(result.value, 'Producto guardado.')
  }

  const submitPresentations = (
    rows: Array<PresentationDraft>,
    defaultId: string,
  ) => {
    if (!presenting) return
    const result = validatePresentations(presenting, products, rows, defaultId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    commit(
      withPresentations(
        presenting,
        result.value.presentations,
        result.value.defaultId,
      ),
      'Presentaciones actualizadas.',
    )
  }

  const toggle = (product: CatalogProduct) =>
    commit(
      { ...product, published: !product.published },
      product.published ? 'Producto pausado.' : 'Producto publicado.',
    )

  return (
    <>
      <PageHeading
        eyebrow="ABARROTEROS · ALMACÉN"
        title="Catálogo"
        description="Los productos que ofreces a tus clientes."
        actions={
          <>
            <CatalogButton
              className="min-h-[43px] flex-1 px-[13px] text-[13px] md:min-h-11 md:flex-none md:px-[17px] md:text-sm"
              onClick={() => setImportOpen(true)}
            >
              Importar CSV
            </CatalogButton>
            <CatalogButton
              tone="primary"
              className="min-h-[43px] flex-1 gap-0 px-[13px] text-[13px] md:min-h-11 md:flex-none md:gap-[9px] md:px-[17px] md:text-sm"
              onClick={() => setEditor({})}
            >
              <PlusIcon className="size-[18px]" />
              Nuevo producto
            </CatalogButton>
          </>
        }
      />
      <CatalogBanner />
      <CatalogToolbar
        query={query}
        onQueryChange={setQuery}
        published={published}
        paused={paused}
      />
      <div className="grid grid-cols-2 gap-2.5 phone:gap-3.5 md:gap-4 tablet:grid-cols-3 wide:gap-5">
        {visible.map((product) => (
          <CatalogCard
            key={product.id}
            product={product}
            onPresentations={() => setPresentationsId(product.id)}
            onEdit={() => setEditor({ productId: product.id })}
            onTogglePublished={() => toggle(product)}
          />
        ))}
      </div>
      {visible.length === 0 && <CatalogEmpty />}
      {editor && (
        <ProductFormDialog
          key={editor.productId ?? 'new'}
          product={editing}
          onSubmit={submitProduct}
          onClose={() => setEditor(undefined)}
        />
      )}
      {presenting && (
        <PresentationsDialog
          key={presenting.id}
          product={presenting}
          onSubmit={submitPresentations}
          onClose={() => setPresentationsId(undefined)}
        />
      )}
      {pending && (
        <SensitiveOperationDialog
          requester={REQUESTER}
          action={pending.message}
          review={pending.review}
          onCancel={() => setPending(undefined)}
          onConfirm={() => store(pending.product, pending.message)}
        />
      )}
      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        initialMode="catalog"
        products={importReferenceProducts(products)}
        onApply={applyImport}
      />
    </>
  )
}
