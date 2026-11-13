import { PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PageHeading } from '#/components/page-heading'
import { SupplierSelect } from '#/components/supplier-select'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogCard } from '#/modules/catalog/components/catalog-card'
import { CatalogEmpty } from '#/modules/catalog/components/catalog-empty'
import { CatalogStatusFilter } from '#/modules/catalog/components/catalog-status-filter'
import type { CatalogStatus } from '#/modules/catalog/components/catalog-status-filter'
import { CatalogTable } from '#/modules/catalog/components/catalog-table'
import { CatalogToolbar } from '#/modules/catalog/components/catalog-toolbar'
import { CatalogViewToggle } from '#/modules/catalog/components/catalog-view-toggle'
import { ProductFormDialog } from '#/modules/catalog/forms/product-form-dialog'
import { SuppliersDialog } from '#/modules/catalog/forms/suppliers-dialog'
import { useCatalogActions } from '#/modules/catalog/hooks/use-catalog'
import { useCatalogView } from '#/modules/catalog/hooks/use-catalog-view'
import { inventoryNote } from '#/modules/catalog/lib/catalog-view'
import { importReferenceProducts } from '#/modules/catalog/lib/catalog-import'
import {
  filterCatalog,
  publicationCounts,
  splitArchived,
} from '#/modules/catalog/lib/catalog-search'
import { netCostPerPieceOf } from '#/modules/pricing/lib/product-costs'
import { CardPrices } from '#/modules/pricing/components/card-prices'
import { PriceHistorySheet } from '#/modules/pricing/components/price-history-sheet'
import { WarehouseSelect } from '#/modules/pricing/components/warehouse-select'
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
import { hasWarehouseChoice } from '#/modules/warehouses/lib/warehouse-choice'

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
  const [view, setView] = useCatalogView()
  const [query, setQuery] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [status, setStatus] = useState<CatalogStatus>('active')
  const [editor, setEditor] = useState<Editor>()
  const [suppliersOpen, setSuppliersOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [pricesId, setPricesId] = useState<string>()
  const [history, setHistory] = useState<HistoryTarget>()

  const editing = products.find(({ id }) => id === editor?.productId)
  const { active, archived } = splitArchived(products)
  const visible = filterCatalog(
    status === 'archived' ? archived : active,
    query,
    supplierId,
  )
  const { published, paused } = publicationCounts(active)
  const supplierNames = new Map(suppliers.map(({ id, name }) => [id, name]))

  const warehouse = pricing.warehouses.find(
    ({ id }) => id === pricing.selectedId,
  )
  const managed = pricing.warehouses.filter((option) => option.canManage)
  // Supplier cost is global; the owner and any warehouse manager edit it.
  const canEditCost = canManage || managed.length > 0
  const priceRows = useMemo(
    () => joinProducts(pricing.rows, products),
    [pricing.rows, products],
  )
  const priceGroups = useMemo(() => pricesByProduct(priceRows), [priceRows])
  const openPrices = pricesId ? priceGroups.get(pricesId) : undefined
  const openProduct = products.find(({ id }) => id === pricesId)

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
        {warehouse && hasWarehouseChoice(pricing.warehouses) && (
          <WarehouseSelect
            warehouses={pricing.warehouses}
            value={warehouse.id}
            onChange={onSelectWarehouse}
          />
        )}
        <SupplierSelect
          suppliers={suppliers}
          value={supplierId}
          onChange={setSupplierId}
        />
        <CatalogViewToggle value={view} onChange={setView} />
        {(archived.length > 0 || status === 'archived') && (
          <CatalogStatusFilter
            value={status}
            archivedCount={archived.length}
            onChange={setStatus}
          />
        )}
      </CatalogToolbar>
      <p className="mb-3.5 text-xs leading-[1.5] text-[#9f8f94]">
        {warehouse
          ? 'Es una referencia: cada lote puede venderse más caro al darle entrada. '
          : ''}
        {inventoryNote(active)}
      </p>
      {view === 'table' ? (
        <CatalogTable
          products={visible}
          groups={priceGroups}
          supplierNames={supplierNames}
          showPrices={Boolean(warehouse)}
          costOf={canEditCost ? netCostPerPieceOf : undefined}
          canManage={canManage}
          onPrices={setPricesId}
          onEdit={(productId) => setEditor({ productId })}
          onRestore={(productId) => void actions.restoreProduct(productId)}
        />
      ) : (
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
                    netCostPerPiece={
                      canEditCost ? netCostPerPieceOf(product) : undefined
                    }
                  />
                ) : undefined
              }
              onPrices={
                warehouse && priceGroups.get(product.id)?.rows.length
                  ? () => setPricesId(product.id)
                  : undefined
              }
              onEdit={() => setEditor({ productId: product.id })}
              onRestore={() => void actions.restoreProduct(product.id)}
            />
          ))}
        </div>
      )}
      {visible.length === 0 && <CatalogEmpty />}
      {warehouse && openPrices && openProduct && (
        <ProductPricesDialog
          key={`${warehouse.id}:${openPrices.productId}`}
          product={openProduct}
          group={openPrices}
          warehouseName={warehouse.name}
          canEdit={warehouse.canManage}
          canEditCost={canEditCost}
          onSaveCost={(patch) => actions.savePieceCost(openProduct.id, patch)}
          onSavePrices={pricingActions.savePrices}
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
      {canManage && editor && (
        <ProductFormDialog
          key={editor.productId ?? 'new'}
          product={editing}
          suppliers={suppliers}
          warehouseName={warehouse?.name}
          onArchive={
            editor.productId
              ? () => actions.archiveProduct(editor.productId!)
              : undefined
          }
          onSubmit={(draft, presentations) =>
            actions.saveProduct(
              editor.productId,
              draft,
              presentations,
              pricing.selectedId,
            )
          }
          onClose={() => setEditor(undefined)}
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
          warehouseName={warehouse?.name}
          onApply={(result) => {
            if (result.mode !== 'catalog') return
            if (!warehouse) {
              toast.error('Crea un almacén antes de importar productos.')
              return
            }
            void actions.importProducts(warehouse, result.products)
          }}
        />
      )}
    </>
  )
}
