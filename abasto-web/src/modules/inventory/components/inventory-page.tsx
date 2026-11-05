import {
  ArrowDownToLineIcon,
  ClipboardCheckIcon,
  LayoutGridIcon,
  PlusIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'

import { PageHeading } from '#/components/page-heading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { ActionButton } from '#/modules/inventory/components/action-button'
import { CountsTab } from '#/modules/inventory/components/counts-tab'
import { EntriesTab } from '#/modules/inventory/components/entries-tab'
import { MovementsTab } from '#/modules/inventory/components/movements-tab'
import type { ProductLabel } from '#/modules/inventory/components/movement-table'
import { ProductsTab } from '#/modules/inventory/components/products-tab'
import { WarehouseSummary } from '#/modules/inventory/components/warehouse-summary'
import { CountDialog } from '#/modules/inventory/forms/count-dialog'
import { LotsDialog } from '#/modules/inventory/forms/lots-dialog'
import { MinimumDialog } from '#/modules/inventory/forms/minimum-dialog'
import { PurchaseDialog } from '#/modules/inventory/forms/purchase-dialog'
import type { SavedPurchase } from '#/modules/inventory/forms/purchase-dialog'
import { PurchaseResultDialog } from '#/modules/inventory/forms/purchase-result-dialog'
import type { PurchaseResult } from '#/modules/inventory/forms/purchase-result-dialog'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import {
  packInfoOf,
  quantityPresentations,
} from '#/modules/inventory/lib/pack-info'
import {
  filterStock,
  productStatus,
} from '#/modules/inventory/lib/stock-metrics'
import type { StatusFilter } from '#/modules/inventory/lib/stock-metrics'
import type { InventoryOverview } from '#/modules/inventory/types/stock'
import type {
  CatalogProduct,
  CatalogSupplier,
} from '#/modules/catalog/lib/catalog-types'
import type { ProductStock } from '#/modules/inventory/services/stock-reads'

type InventoryPageProps = {
  overview: InventoryOverview
  products: Array<CatalogProduct>
  suppliers: Array<CatalogSupplier>
  /** Pre-filled product search, e.g. from Catálogo "Consultar inventario". */
  initialQuery: string
  onSelectWarehouse: (warehouseId: string) => void
}

const tabs: Array<{ name: string; icon: LucideIcon }> = [
  { name: 'Productos', icon: LayoutGridIcon },
  { name: 'Entradas', icon: ArrowDownToLineIcon },
  { name: 'Movimientos', icon: RotateCcwIcon },
  { name: 'Conteos', icon: ClipboardCheckIcon },
]

const headingButton =
  'max-md:min-h-[43px] max-md:px-[11px] max-md:py-[9px] max-md:text-[11px]'

type Dialog =
  | { kind: 'purchase' }
  | { kind: 'count' }
  | { kind: 'minimum'; productId: string }
  | { kind: 'lots'; productId: string }

export function InventoryPage({
  overview,
  products,
  suppliers,
  initialQuery,
  onSelectWarehouse,
}: InventoryPageProps) {
  const actions = useInventoryActions()
  const [tab, setTab] = useState('Productos')
  const [query, setQuery] = useState(initialQuery)
  const [filter, setFilter] = useState<StatusFilter>('Todos')
  const [moveType, setMoveType] = useState('Todos')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [result, setResult] = useState<PurchaseResult | null>(null)

  const labels = useMemo(
    () =>
      new Map<string, ProductLabel>(
        products.map((product) => [
          product.id,
          { name: product.name, sku: product.sku, pack: packInfoOf(product) },
        ]),
      ),
    [products],
  )

  const packs = useMemo(
    () => new Map([...labels].map(([id, label]) => [id, label.pack])),
    [labels],
  )

  const selected = overview.warehouses.find(
    ({ id }) => id === overview.selectedId,
  )
  if (!selected) {
    return (
      <div className="text-base">
        <PageHeading
          eyebrow="CADA PRODUCTO, EN SU LUGAR"
          title="Inventario"
          description="Ten a la mano lo que entra, lo que sale y lo que tienes."
        />
        <p className="text-sm text-ink-muted">
          Aún no tienes almacenes asignados.
        </p>
      </div>
    )
  }

  const { canManage } = selected
  const stock = overview.stock
  const rows = filterStock(stock, query, filter)
  const low = stock.filter((row) => productStatus(row) === 'Stock bajo').length
  const soldOut = stock.filter(
    (row) => productStatus(row) === 'Sin existencias',
  ).length
  const managed = overview.warehouses.filter((warehouse) => warehouse.canManage)
  const lotsRow: ProductStock | undefined =
    dialog?.kind === 'lots'
      ? stock.find((row) => row.productId === dialog.productId)
      : undefined
  const lotsProduct = products.find(({ id }) => id === lotsRow?.productId)

  async function onSaved(purchase: SavedPurchase) {
    setDialog(null)
    const suggestions = await actions.loadSuggestions(purchase.purchaseId)
    const canApply = overview.warehouses.some(
      (warehouse) =>
        warehouse.id === purchase.warehouseId && warehouse.canManage,
    )
    setResult({
      purchaseId: purchase.purchaseId,
      canApply,
      suggestions,
      lots: purchase.lots.map((lot) => {
        const label = labels.get(lot.productId)
        return {
          name: label?.name ?? 'Producto',
          code: lot.code,
          quantity: lot.onHand,
          pack: label?.pack ?? {
            packName: 'piezas',
            factor: 1,
            unit: 'piezas',
          },
        }
      }),
    })
  }

  return (
    <div className="text-base">
      <PageHeading
        eyebrow="CADA PRODUCTO, EN SU LUGAR"
        title="Inventario"
        description="Ten a la mano lo que entra, lo que sale y lo que tienes."
        actions={
          canManage ? (
            <div className="grid w-full grid-cols-2 gap-2.5 md:contents">
              <ActionButton
                className={headingButton}
                onClick={() => setDialog({ kind: 'count' })}
              >
                <ClipboardCheckIcon size={18} />
                Hacer conteo
              </ActionButton>
              <ActionButton
                tone="primary"
                className={headingButton}
                onClick={() => setDialog({ kind: 'purchase' })}
              >
                <PlusIcon size={19} />
                Nueva compra
              </ActionButton>
            </div>
          ) : undefined
        }
      />
      <WarehouseSummary
        warehouses={overview.warehouses}
        selectedId={selected.id}
        onWarehouseChange={(id) => {
          setFilter('Todos')
          onSelectWarehouse(id)
        }}
        counts={{ products: stock.length, low, soldOut }}
        canManage={canManage}
        onStat={(next) => {
          setTab('Productos')
          setFilter(next)
        }}
      />
      <Tabs
        value={tab}
        onValueChange={(next) => {
          setTab(next)
          setQuery('')
        }}
        className="flex-col gap-0"
      >
        <TabsList
          variant="line"
          className="mb-5 h-12 w-full justify-start gap-[22px] overflow-x-auto overflow-y-hidden rounded-none border-b border-[#dfe5ed] p-0 md:mb-[25px] md:gap-[17px] md:overflow-visible tablet:gap-6 wide:gap-[26px]"
        >
          {tabs.map(({ name, icon: Icon }) => (
            <TabsTrigger
              key={name}
              value={name}
              className="h-full flex-none gap-[5px] rounded-none border-0 px-0.5 pt-0 pb-[13px] max-md:px-0 text-xs font-[550] text-[#7a8799] data-[state=active]:font-[650] data-[state=active]:text-[#183e6a] md:gap-2 md:text-sm after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-t-[3px] after:bg-[#224f80] data-[state=active]:after:opacity-100 max-md:[&_svg]:size-3.5"
            >
              <Icon size={17} />
              {name}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="Productos" className="text-base">
          <ProductsTab
            rows={rows}
            total={stock.length}
            packs={packs}
            today={overview.today}
            canManage={canManage}
            query={query}
            onQueryChange={setQuery}
            filter={filter}
            onFilterChange={setFilter}
            onLots={(row) =>
              setDialog({ kind: 'lots', productId: row.productId })
            }
            onMinimum={(productId) => setDialog({ kind: 'minimum', productId })}
          />
        </TabsContent>
        <TabsContent value="Entradas" className="text-base">
          <EntriesTab
            rows={overview.movements}
            products={labels}
            canManage={canManage}
            onNew={() => setDialog({ kind: 'purchase' })}
          />
        </TabsContent>
        <TabsContent value="Movimientos" className="text-base">
          <MovementsTab
            rows={overview.movements}
            products={labels}
            query={query}
            onQueryChange={setQuery}
            type={moveType}
            onTypeChange={setMoveType}
          />
        </TabsContent>
        <TabsContent value="Conteos" className="text-base">
          <CountsTab
            rows={overview.movements}
            products={labels}
            canManage={canManage}
            onNew={() => setDialog({ kind: 'count' })}
          />
        </TabsContent>
      </Tabs>

      {dialog?.kind === 'purchase' && (
        <PurchaseDialog
          warehouses={managed}
          initialWarehouseId={selected.id}
          suppliers={suppliers}
          products={products}
          today={overview.today}
          onClose={() => setDialog(null)}
          onSaved={(purchase) => void onSaved(purchase)}
        />
      )}
      {dialog?.kind === 'count' && (
        <CountDialog
          warehouseId={selected.id}
          products={products}
          stock={stock}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'minimum' && (
        <MinimumDialog
          warehouseId={selected.id}
          products={products}
          stock={stock}
          initialProductId={dialog.productId}
          onClose={() => setDialog(null)}
        />
      )}
      {lotsRow && (
        <LotsDialog
          stock={lotsRow}
          pack={
            labels.get(lotsRow.productId)?.pack ?? {
              packName: lotsRow.unit,
              factor: 1,
              unit: lotsRow.unit,
            }
          }
          presentations={lotsProduct ? quantityPresentations(lotsProduct) : []}
          today={overview.today}
          canManage={canManage}
          onClose={() => setDialog(null)}
        />
      )}
      {result && (
        <PurchaseResultDialog result={result} onClose={() => setResult(null)} />
      )}
    </div>
  )
}
