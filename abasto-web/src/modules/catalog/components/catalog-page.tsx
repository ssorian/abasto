import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { PageHeading } from '#/components/page-heading'
import { CatalogBanner } from '#/modules/catalog/components/catalog-banner'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogCard } from '#/modules/catalog/components/catalog-card'
import { CatalogEmpty } from '#/modules/catalog/components/catalog-empty'
import { CatalogToolbar } from '#/modules/catalog/components/catalog-toolbar'
import { PresentationsDialog } from '#/modules/catalog/forms/presentations-dialog'
import { ProductFormDialog } from '#/modules/catalog/forms/product-form-dialog'
import { SuppliersDialog } from '#/modules/catalog/forms/suppliers-dialog'
import { useCatalogActions } from '#/modules/catalog/hooks/use-catalog'
import { importReferenceProducts } from '#/modules/catalog/lib/catalog-import'
import {
  filterCatalog,
  publicationCounts,
} from '#/modules/catalog/lib/catalog-search'
import { ImportCsvDialog } from '#/modules/product-import/components/import-csv-dialog'

import type {
  CatalogProduct,
  CatalogSupplier,
} from '#/modules/catalog/lib/catalog-types'

type CatalogPageProps = {
  products: Array<CatalogProduct>
  suppliers: Array<CatalogSupplier>
  /** Owner-only (`catalog.manage`); staff can browse. */
  canManage: boolean
}

/** Editor target: `{}` creates a product, `{ productId }` edits one. */
type Editor = { productId?: string } | undefined

export function CatalogPage({
  products,
  suppliers,
  canManage,
}: CatalogPageProps) {
  const actions = useCatalogActions()
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Editor>()
  const [presentationsId, setPresentationsId] = useState<string>()
  const [suppliersOpen, setSuppliersOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const editing = products.find(({ id }) => id === editor?.productId)
  const presenting = products.find(({ id }) => id === presentationsId)
  const visible = filterCatalog(products, query)
  const { published, paused } = publicationCounts(products)
  const supplierNames = new Map(suppliers.map(({ id, name }) => [id, name]))

  return (
    <>
      <PageHeading
        eyebrow="ABARROTEROS · ALMACÉN"
        title="Catálogo"
        description="Los productos que ofreces a tus clientes."
        actions={
          canManage ? (
            <>
              <CatalogButton
                className="min-h-[43px] flex-1 px-[13px] text-[13px] md:min-h-11 md:flex-none md:px-[17px] md:text-sm"
                onClick={() => setSuppliersOpen(true)}
              >
                Proveedores
              </CatalogButton>
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
          ) : undefined
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
            canManage={canManage}
            supplierName={
              product.supplierId
                ? supplierNames.get(product.supplierId)
                : undefined
            }
            onPresentations={() => setPresentationsId(product.id)}
            onEdit={() => setEditor({ productId: product.id })}
            onTogglePublished={() =>
              void actions.setPublished(product.id, !product.published)
            }
          />
        ))}
      </div>
      {visible.length === 0 && <CatalogEmpty />}
      {canManage && editor && (
        <ProductFormDialog
          key={editor.productId ?? 'new'}
          product={editing}
          suppliers={suppliers}
          onSubmit={(draft) => actions.saveProduct(editor.productId, draft)}
          onClose={() => setEditor(undefined)}
        />
      )}
      {canManage && presenting && (
        <PresentationsDialog
          key={presenting.id}
          product={presenting}
          onSubmit={(rows, defaultKey) =>
            actions.savePresentations(presenting.id, rows, defaultKey)
          }
          onClose={() => setPresentationsId(undefined)}
        />
      )}
      {canManage && suppliersOpen && (
        <SuppliersDialog
          suppliers={suppliers}
          onSubmit={actions.saveSupplier}
          onClose={() => setSuppliersOpen(false)}
        />
      )}
      {canManage && (
        <ImportCsvDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          modes={['catalog']}
          products={importReferenceProducts(products)}
          onApply={(result) => {
            if (result.mode === 'catalog')
              void actions.importProducts(result.products)
          }}
        />
      )}
    </>
  )
}
