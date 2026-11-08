import { PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PageHeading } from '#/components/page-heading'
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
import { CardPrices } from '#/modules/pricing/components/card-prices'
import { PriceHistorySheet } from '#/modules/pricing/components/price-history-sheet'
import { WarehouseSelect } from '#/modules/pricing/components/warehouse-select'
import { BulkChangeDialog } from '#/modules/pricing/forms/bulk-change-dialog'
import { ProductPricesDialog } from '#/modules/pricing/forms/product-prices-dialog'
import { usePricingActions } from '#/modules/pricing/hooks/use-pricing'
import {
  joinProducts,
  pricesByProduct,
} from '#/modules/pricing/lib/price-table'
import { ImportCsvDialog } from '#/modules/product-import/components/import-csv-dialog'

import type {
  CatalogProduct,
  CatalogSupplier,
} from '#/modules/catalog/lib/catalog-types'
import type { PricingOverview } from '#/modules/pricing/lib/price-table'

type CatalogPageProps = {
  products: Array<CatalogProduct>
  suppliers: Array<CatalogSupplier>
  /** Owner-only (`catalog.manage`); staff can browse. */
  canManage: boolean
  pricing: PricingOverview
  onSelectWarehouse: (id: string) => void
}

/** Editor target: `{}` creates a product, `{ productId }` edits one. */
type Editor = { productId?: string } | undefined

type HistoryTarget = {
  warehouseId: string
  presentationId: string
  title: string
}

const headerButton =
  'min-h-[43px] flex-1 px-[13px] text-[13px] md:min-h-11 md:flex-none md:px-[17px] md:text-sm'

export function CatalogPage({
  products,
  suppliers,
  canManage,
  pricing,
  onSelectWarehouse,
}: CatalogPageProps) {
  const actions = useCatalogActions()
  const pricingActions = usePricingActions(pricing.selectedId)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Editor>()
  const [presentationsId, setPresentationsId] = useState<string>()
  const [suppliersOpen, setSuppliersOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [pricesId, setPricesId] = useState<string>()
  const [history, setHistory] = useState<HistoryTarget>()
  const [bulkOpen, setBulkOpen] = useState(false)

  const editing = products.find(({ id }) => id === editor?.productId)
  const presenting = products.find(({ id }) => id === presentationsId)
  const visible = filterCatalog(products, query)
  const { published, paused } = publicationCounts(products)
  const supplierNames = new Map(suppliers.map(({ id, name }) => [id, name]))

  const warehouse = pricing.warehouses.find(
    ({ id }) => id === pricing.selectedId,
  )
  const managed = pricing.warehouses.filter((option) => option.canManage)
  const priceRows = useMemo(
    () => joinProducts(pricing.rows, products),
    [pricing.rows, products],
  )
  const priceGroups = useMemo(() => pricesByProduct(priceRows), [priceRows])
  const categories = [...new Set(products.map(({ category }) => category))]
    .filter(Boolean)
    .sort()
  const openPrices = pricesId ? priceGroups.get(pricesId) : undefined

  return (
    <>
      <PageHeading
        title="Catálogo"
        description="Los productos que ofreces a tus clientes y su precio en cada almacén."
        actions={
          canManage || managed.length > 0 ? (
            <>
              {canManage && (
                <>
                  <CatalogButton
                    className={headerButton}
                    onClick={() => setSuppliersOpen(true)}
                  >
                    Proveedores
                  </CatalogButton>
                  <CatalogButton
                    className={headerButton}
                    onClick={() => setImportOpen(true)}
                  >
                    Importar CSV
                  </CatalogButton>
                </>
              )}
              {managed.length > 0 && (
                <CatalogButton
                  className={headerButton}
                  onClick={() => setBulkOpen(true)}
                >
                  Cambio masivo de precios
                </CatalogButton>
              )}
              {canManage && (
                <CatalogButton
                  tone="primary"
                  className={`${headerButton} gap-0 md:gap-[9px]`}
                  onClick={() => setEditor({})}
                >
                  <PlusIcon className="size-[18px]" />
                  Nuevo producto
                </CatalogButton>
              )}
            </>
          ) : undefined
        }
      />
      <CatalogToolbar
        query={query}
        onQueryChange={setQuery}
        published={published}
        paused={paused}
      >
        {warehouse && pricing.warehouses.length > 1 && (
          <WarehouseSelect
            warehouses={pricing.warehouses}
            value={warehouse.id}
            onChange={onSelectWarehouse}
          />
        )}
      </CatalogToolbar>
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
            prices={
              warehouse ? (
                <CardPrices
                  group={priceGroups.get(product.id)}
                  warehouseName={warehouse.name}
                  canEdit={warehouse.canManage}
                  onOpen={() => setPricesId(product.id)}
                />
              ) : undefined
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
      {warehouse && openPrices && (
        <ProductPricesDialog
          key={`${warehouse.id}:${openPrices.productId}`}
          group={openPrices}
          warehouseName={warehouse.name}
          canEdit={warehouse.canManage}
          marginBps={
            pricing.margins
              ? (pricing.margins[openPrices.productId] ?? 0)
              : null
          }
          onSavePrices={pricingActions.savePrices}
          onSaveMargin={(bps) =>
            pricingActions.saveMargin(openPrices.productId, bps)
          }
          onHistory={(row) => {
            setPricesId(undefined)
            setHistory({
              warehouseId: warehouse.id,
              presentationId: row.presentationId,
              title: `${row.productName} · ${row.presentationName}`,
            })
          }}
          onClose={() => setPricesId(undefined)}
        />
      )}
      {history && (
        <PriceHistorySheet
          target={history}
          onClose={() => setHistory(undefined)}
        />
      )}
      {bulkOpen && (
        <BulkChangeDialog
          warehouses={managed}
          currentWarehouse={warehouse?.canManage ? warehouse : undefined}
          rows={priceRows}
          suppliers={suppliers}
          categories={categories}
          products={products}
          onSubmit={pricingActions.bulkChange}
          onClose={() => setBulkOpen(false)}
        />
      )}
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
