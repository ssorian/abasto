import { useState } from 'react'
import {
  ArrowDownToLineIcon,
  ClipboardCheckIcon,
  LayoutGridIcon,
  PlusIcon,
  RotateCcwIcon,
  TruckIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { PageHeading } from '#/components/page-heading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { ActionButton } from '#/modules/inventory/components/action-button'
import { CountsTab } from '#/modules/inventory/components/counts-tab'
import { EntriesTab } from '#/modules/inventory/components/entries-tab'
import { MovementsTab } from '#/modules/inventory/components/movements-tab'
import { ProductDetailSheet } from '#/modules/inventory/components/product-detail-sheet'
import { ProductsTab } from '#/modules/inventory/components/products-tab'
import { TransfersTab } from '#/modules/inventory/components/transfers-tab'
import { WarehouseSummary } from '#/modules/inventory/components/warehouse-summary'
import { CountDialog } from '#/modules/inventory/forms/count-dialog'
import { EntryDetailDialog } from '#/modules/inventory/forms/entry-detail-dialog'
import { MovementDetailDialog } from '#/modules/inventory/forms/movement-detail-dialog'
import { OperationDialog } from '#/modules/inventory/forms/operation-dialog'
import { ReceiptDialog } from '#/modules/inventory/forms/receipt-dialog'
import { TransferReceiveDialog } from '#/modules/inventory/forms/transfer-receive-dialog'
import { useInventoryState } from '#/modules/inventory/hooks/use-inventory-state'
import { inventoryProducts } from '#/modules/inventory/lib/catalog'
import {
  filterMovements,
  filterProducts,
  productRows,
} from '#/modules/inventory/lib/filters'
import {
  applyCount,
  changeStock,
  receive,
  receiveTransfer,
  saveCount,
} from '#/modules/inventory/lib/operations'
import { stockStatus } from '#/modules/inventory/lib/stock'
import { ImportCsvDialog } from '#/modules/product-import/components/import-csv-dialog'
import { warehouseNames } from '#/shared/demo/types'

import type { WarehouseName } from '#/shared/demo/types'
import type { OperationRequest } from '#/modules/inventory/forms/operation-dialog'
import type { ProductSort, StatusFilter } from '#/modules/inventory/lib/filters'
import type { ProductView } from '#/modules/inventory/components/product-toolbar'
import type { ImportResult } from '#/modules/product-import/lib/import-types'
import type {
  Count,
  Entry,
  InventoryProduct,
  Movement,
  Transfer,
  WarehouseScope,
} from '#/modules/inventory/types/inventory'

type InventoryPageProps = {
  /** Pre-filled product search, e.g. from Catálogo "Consultar inventario". */
  initialQuery: string
  /** Warehouse shown first, e.g. from Almacenes "Ver inventario". */
  initialWarehouse: WarehouseName
}

const tabs: Array<{ name: string; icon: LucideIcon }> = [
  { name: 'Productos', icon: LayoutGridIcon },
  { name: 'Entradas', icon: ArrowDownToLineIcon },
  { name: 'Movimientos', icon: RotateCcwIcon },
  { name: 'Conteos', icon: ClipboardCheckIcon },
  { name: 'Traslados', icon: TruckIcon },
]

const headingButton =
  'max-md:min-h-[43px] max-md:px-[11px] max-md:py-[9px] max-md:text-[11px]'

export function InventoryPage({
  initialQuery,
  initialWarehouse,
}: InventoryPageProps) {
  const { state, apply } = useInventoryState()
  const [tab, setTab] = useState('Productos')
  const [warehouse, setWarehouse] = useState<WarehouseScope>(initialWarehouse)
  const [query, setQuery] = useState(initialQuery)
  const [filter, setFilter] = useState<StatusFilter>('Todos')
  const [category, setCategory] = useState('Todas')
  const [sort, setSort] = useState<ProductSort>('Nombre')
  const [view, setView] = useState<ProductView>('cards')
  const [moveType, setMoveType] = useState('Todos')
  const [moveDay, setMoveDay] = useState('')

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailWarehouse, setDetailWarehouse] =
    useState<WarehouseName>('Centro')
  const [entryOpen, setEntryOpen] = useState(false)
  const [entryProductId, setEntryProductId] = useState<string | null>(null)
  const [operation, setOperation] = useState<OperationRequest | null>(null)
  const [countOpen, setCountOpen] = useState(false)
  const [activeCount, setActiveCount] = useState<Count | null>(null)
  const [entryDetail, setEntryDetail] = useState<Entry | null>(null)
  const [movementDetail, setMovementDetail] = useState<Movement | null>(null)
  const [receiving, setReceiving] = useState<Transfer | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  // Dialogs that need a concrete warehouse fall back to Centro for "Todos".
  const specific: WarehouseName = warehouse === 'Todos' ? 'Centro' : warehouse
  const rows = productRows(state, warehouse)
  const filtered = filterProducts(rows, query, category, filter, sort)
  const movements = filterMovements(
    state.movements,
    warehouse,
    query,
    moveType,
    moveDay,
  )
  const lowCount = rows.filter(
    (row) => stockStatus(row.stock) === 'Stock bajo',
  ).length
  const soldOutCount = rows.filter(
    (row) => stockStatus(row.stock) === 'Agotado',
  ).length
  const detailProduct =
    inventoryProducts.find((product) => product.id === detailId) ?? null

  const hasHistory = (sku: string, target: WarehouseName) => {
    const product = inventoryProducts.find(
      (item) => item.sku.toLowerCase() === sku.toLowerCase(),
    )
    const stock = state.stocks.find(
      (item) => item.productId === product?.id && item.warehouse === target,
    )
    return !!stock && (stock.received || stock.lots.length > 0)
  }
  const openEntry = (
    productId: string | null,
    target: WarehouseName = specific,
  ) => {
    setEntryProductId(productId)
    setDetailWarehouse(target)
    setDetailId(null)
    setEntryOpen(true)
  }
  const openDetail = (product: InventoryProduct) => {
    setDetailWarehouse(specific)
    setDetailId(product.id)
  }
  const openOperation = (
    type: 'out' | 'adjust',
    productId: string,
    transfer = false,
  ) => {
    setDetailId(null)
    setOperation({
      type,
      productId,
      transfer,
      warehouse: transfer ? specific : detailWarehouse,
    })
  }
  const openCount = (count: Count | null) => {
    setActiveCount(count)
    setCountOpen(true)
  }
  const applyImport = (result: ImportResult) => {
    if (result.mode !== 'stock') return
    const targets = warehouseNames.filter((name) =>
      result.entries.some((entry) => entry.warehouse === name),
    )
    apply((current) => {
      let next = current
      for (const target of targets) {
        const lines = result.entries
          .filter((entry) => entry.warehouse === target)
          .map((entry) => ({
            productId: entry.productId,
            qty: entry.baseQuantity,
            cost: entry.baseCost,
            lot: entry.lot,
            expiry: entry.expiry,
            salePrice: entry.salePrice,
          }))
        next = receive(
          next,
          target,
          `Carga inicial CSV · ${result.filename}`,
          new Date().toISOString(),
          lines,
        )
      }
      return next
    }, 'Importación CSV registrada.')
  }

  return (
    <div className="text-base">
      <PageHeading
        eyebrow="CADA PRODUCTO, EN SU LUGAR"
        title="Inventario"
        description="Ten a la mano lo que entra, lo que sale y lo que tienes."
        actions={
          <div className="grid w-full grid-cols-2 gap-2.5 md:contents">
            <ActionButton
              className={headingButton}
              onClick={() => setImportOpen(true)}
            >
              Importar CSV
            </ActionButton>
            <ActionButton
              className={headingButton}
              onClick={() => openCount(null)}
            >
              <ClipboardCheckIcon size={18} />
              Hacer conteo
            </ActionButton>
            <ActionButton
              tone="primary"
              className={`${headingButton} max-md:col-span-2`}
              onClick={() => openEntry(null)}
            >
              <PlusIcon size={19} />
              Nueva entrada
            </ActionButton>
          </div>
        }
      />
      <WarehouseSummary
        warehouse={warehouse}
        onWarehouseChange={(next) => {
          setWarehouse(next)
          setFilter('Todos')
        }}
        counts={{
          products: inventoryProducts.length,
          low: lowCount,
          soldOut: soldOutCount,
        }}
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
              {name === 'Productos' && (
                <span className="rounded-[5px] bg-[#e8edf4] max-md:hidden px-1.5 py-px text-xs font-[650] text-[#36577c]">
                  {inventoryProducts.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="Productos" className="text-base">
          <ProductsTab
            rows={filtered}
            total={inventoryProducts.length}
            lowCount={lowCount}
            query={query}
            onQueryChange={setQuery}
            category={category}
            onCategoryChange={setCategory}
            sort={sort}
            onSortChange={setSort}
            filter={filter}
            onFilterChange={setFilter}
            view={view}
            onViewChange={setView}
            onOpen={openDetail}
            onRestock={(product) => openEntry(product.id)}
            onClear={() => {
              setQuery('')
              setFilter('Todos')
              setCategory('Todas')
            }}
          />
        </TabsContent>
        <TabsContent value="Entradas" className="text-base">
          <EntriesTab
            entries={state.entries}
            warehouse={warehouse}
            onSelect={setEntryDetail}
            onNew={() => openEntry(null)}
          />
        </TabsContent>
        <TabsContent value="Movimientos" className="text-base">
          <MovementsTab
            rows={movements}
            query={query}
            onQueryChange={setQuery}
            type={moveType}
            onTypeChange={setMoveType}
            day={moveDay}
            onDayChange={setMoveDay}
            onSelect={setMovementDetail}
          />
        </TabsContent>
        <TabsContent value="Conteos" className="text-base">
          <CountsTab
            counts={state.counts}
            warehouse={warehouse}
            onOpen={openCount}
          />
        </TabsContent>
        <TabsContent value="Traslados" className="text-base">
          <TransfersTab
            transfers={state.transfers}
            warehouse={warehouse}
            onNew={() => openOperation('out', inventoryProducts[0].id, true)}
            onReceive={setReceiving}
          />
        </TabsContent>
      </Tabs>

      <ProductDetailSheet
        state={state}
        product={detailProduct}
        warehouse={detailWarehouse}
        onWarehouseChange={setDetailWarehouse}
        apply={apply}
        onClose={() => setDetailId(null)}
        onEntry={() =>
          detailProduct && openEntry(detailProduct.id, detailWarehouse)
        }
        onOperation={(type) =>
          detailProduct && openOperation(type, detailProduct.id)
        }
        onMovement={setMovementDetail}
      />
      {entryOpen && (
        <ReceiptDialog
          state={state}
          warehouse={detailWarehouse}
          initialProductId={entryProductId}
          onClose={() => setEntryOpen(false)}
          onConfirm={(target, reference, date, lines) => {
            const ok = apply(
              (current) => receive(current, target, reference, date, lines),
              'Entrada registrada. Tu inventario está actualizado.',
            )
            if (ok) {
              setWarehouse(target)
              setEntryOpen(false)
            }
            return ok
          }}
        />
      )}
      {operation && (
        <OperationDialog
          operation={operation}
          state={state}
          onClose={() => setOperation(null)}
          onConfirm={(change) => {
            const ok = apply(
              (current) => changeStock(current, change),
              operation.type === 'out'
                ? 'Salida registrada correctamente.'
                : 'Ajuste registrado correctamente.',
            )
            if (ok) setOperation(null)
            return ok
          }}
        />
      )}
      {countOpen && (
        <CountDialog
          warehouse={specific}
          state={state}
          initialCount={activeCount}
          onClose={() => {
            setCountOpen(false)
            setActiveCount(null)
          }}
          onSave={(count) =>
            apply(
              (current) => saveCount(current, count),
              'Conteo físico registrado.',
            )
          }
          onApply={(count, productIds) =>
            apply(
              (current) => applyCount(current, count, productIds),
              'Diferencias de conteo ajustadas.',
            )
          }
        />
      )}
      {entryDetail && (
        <EntryDetailDialog
          entry={entryDetail}
          onClose={() => setEntryDetail(null)}
        />
      )}
      {movementDetail && (
        <MovementDetailDialog
          movement={movementDetail}
          onClose={() => setMovementDetail(null)}
        />
      )}
      {receiving && (
        <TransferReceiveDialog
          transfer={receiving}
          onClose={() => setReceiving(null)}
          onConfirm={(quantities, note) =>
            apply(
              (current) =>
                receiveTransfer(current, receiving.id, quantities, note),
              'Recepción registrada. Existencias actualizadas.',
            )
          }
        />
      )}
      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        initialMode="stock"
        hasStockHistory={hasHistory}
        onApply={applyImport}
      />
    </div>
  )
}
