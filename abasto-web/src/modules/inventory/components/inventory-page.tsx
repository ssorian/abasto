import {
  ClipboardCheckIcon,
  LayoutGridIcon,
  ClockIcon,
  PlusIcon,
  RotateCcwIcon,
  ScaleIcon,
  TruckIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'

import { PageHeading } from '#/components/page-heading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { ActionButton } from '#/modules/inventory/components/action-button'
import { CountsTab } from '#/modules/inventory/components/counts-tab'
import { MovementsTab } from '#/modules/inventory/components/movements-tab'
import type { ProductLabel } from '#/modules/inventory/components/movement-table'
import { activeProducts } from '#/modules/inventory/lib/active-products'
import { ProductsTab } from '#/modules/inventory/components/products-tab'
import { SupplierOrdersTab } from '#/modules/inventory/components/supplier-orders-tab'
import { SupplierPendingsTab } from '#/modules/inventory/components/supplier-pendings-tab'
import { WarehouseSummary } from '#/modules/inventory/components/warehouse-summary'
import { CountDialog } from '#/modules/inventory/forms/count-dialog'
import { LotsDialog } from '#/modules/inventory/forms/lots-dialog'
import { MinimumDialog } from '#/modules/inventory/forms/minimum-dialog'
import { CancelOrderDialog } from '#/modules/inventory/forms/cancel-order-dialog'
import { OrderDetailDialog } from '#/modules/inventory/forms/order-detail-dialog'
import { OrderDialog } from '#/modules/inventory/forms/order-dialog'
import { ReceptionDialog } from '#/modules/inventory/forms/reception-dialog'
import { ReturnDialog } from '#/modules/inventory/forms/return-dialog'
import { ScrapDialog } from '#/modules/inventory/forms/scrap-dialog'
import { tabBadges } from '#/modules/inventory/lib/tab-badges'
import type { InventoryAction } from '#/modules/inventory/lib/inventory-action'
import {
  packInfoOf,
  quantityPresentations,
} from '#/modules/inventory/lib/pack-info'
import {
  filterStock,
  matchesFilter,
  productStatus,
} from '#/modules/inventory/lib/stock-metrics'
import type { StatusFilter } from '#/modules/inventory/lib/stock-metrics'
import type { InventoryOverview } from '#/modules/inventory/types/stock'
import { TransfersTab } from '#/modules/transfers/components/transfers-tab'
import { CancelTransferDialog } from '#/modules/transfers/forms/cancel-transfer-dialog'
import { ReceiveDialog } from '#/modules/transfers/forms/receive-dialog'
import { TransferDialog } from '#/modules/transfers/forms/transfer-dialog'
import type { TransferListItem } from '#/modules/transfers/services/transfer-reads'
import type { TransfersOverview } from '#/modules/transfers/types/transfers'
import type {
  CatalogProduct,
  CatalogSupplier,
} from '#/modules/catalog/lib/catalog-types'
import type { ProductStock } from '#/modules/inventory/services/stock-reads'
import type { SupplierOrderSummary } from '#/modules/inventory/services/supplier-orders'
import type {
  PendingBalance,
  PendingEntry,
} from '#/modules/inventory/services/supplier-pendings'

type InventoryPageProps = {
  overview: InventoryOverview
  products: Array<CatalogProduct>
  suppliers: Array<CatalogSupplier>
  /** Whether the actor may edit catalog products (owner). */
  canEditProducts: boolean
  transfers: TransfersOverview
  /** Supplier orders of the selected warehouse, newest first. */
  supplierOrders: Array<SupplierOrderSummary>
  /** What suppliers owe, with its ledger history. */
  pendings: {
    restock: Array<PendingBalance>
    returns: Array<PendingBalance>
    credits: Array<PendingBalance>
    history: Array<PendingEntry>
  }
  /** Pre-filled product search, e.g. from Catálogo "Consultar inventario". */
  initialQuery: string
  /** Dialog to open on arrival, e.g. from an Inicio alert. */
  initialAction?: InventoryAction
  /** Called when that dialog closes, so a reload does not reopen it. */
  onActionDone?: () => void
  onSelectWarehouse: (warehouseId: string) => void
}

const tabs: Array<{ name: string; icon: LucideIcon }> = [
  { name: 'Productos', icon: LayoutGridIcon },
  { name: 'Por recibir', icon: ClockIcon },
  { name: 'Saldos', icon: ScaleIcon },
  { name: 'Movimientos', icon: RotateCcwIcon },
  { name: 'Conteos', icon: ClipboardCheckIcon },
  { name: 'Traslados', icon: TruckIcon },
]

const headingButton =
  'max-md:min-h-[43px] max-md:px-[11px] max-md:py-[9px] max-md:text-[11px]'

type Dialog =
  | { kind: 'order'; productId?: string }
  | { kind: 'orderDetail'; order: SupplierOrderSummary }
  | { kind: 'receiveOrder'; order: SupplierOrderSummary }
  | { kind: 'cancelOrder'; order: SupplierOrderSummary }
  | { kind: 'return'; pending: PendingBalance }
  | { kind: 'scrap'; pending: PendingBalance }
  | { kind: 'count' }
  | { kind: 'transfer' }
  | { kind: 'receive'; transfer: TransferListItem }
  | { kind: 'cancel'; transfer: TransferListItem }
  | { kind: 'minimum'; productId: string }
  | { kind: 'lots'; productId: string; removeLotId?: string }

export function InventoryPage({
  overview,
  products,
  suppliers,
  canEditProducts,
  transfers,
  supplierOrders,
  pendings,
  initialQuery,
  initialAction,
  onActionDone,
  onSelectWarehouse,
}: InventoryPageProps) {
  const [tab, setTab] = useState('Productos')
  const tabListRef = useRef<HTMLDivElement>(null)
  // On phones the strip scrolls sideways: keep the active tab in view.
  useEffect(() => {
    tabListRef.current
      ?.querySelector('[data-state=active]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [tab])
  const [query, setQuery] = useState(initialQuery)
  const [filter, setFilter] = useState<StatusFilter>('Todos')
  const [supplierId, setSupplierId] = useState('')
  const [moveType, setMoveType] = useState('Todos')
  const [dialog, setDialog] = useState<Dialog | null>(() =>
    initialAction?.kind === 'quitar'
      ? {
          kind: 'lots',
          productId: initialAction.productId,
          removeLotId: initialAction.lotId,
        }
      : initialAction?.kind === 'pedido'
        ? { kind: 'order', productId: initialAction.productId }
        : null,
  )
  const closeDialog = () => {
    setDialog(null)
    if (initialAction) onActionDone?.()
  }

  const pickable = useMemo(() => activeProducts(products), [products])

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

  const supplierOf = useMemo(
    () =>
      new Map(
        products.flatMap((product) =>
          product.supplierId ? [[product.id, product.supplierId] as const] : [],
        ),
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
  const rows = filterStock(stock, query, filter, supplierId, supplierOf)
  const low = stock.filter((row) => matchesFilter(row, 'Stock bajo')).length
  const soldOut = stock.filter(
    (row) => productStatus(row) === 'Sin existencias',
  ).length
  const managed = overview.warehouses.filter((warehouse) => warehouse.canManage)
  const manages = new Set(managed.map((warehouse) => warehouse.id))
  const lotsRow: ProductStock | undefined =
    dialog?.kind === 'lots'
      ? stock.find((row) => row.productId === dialog.productId)
      : undefined
  const lotsProduct = products.find(({ id }) => id === lotsRow?.productId)

  const badges = tabBadges({
    orders: supplierOrders,
    restock: pendings.restock,
    returns: pendings.returns,
  })
  const supplierNames = new Map(
    suppliers.map((supplier) => [supplier.id, supplier.name]),
  )

  return (
    <div className="text-base">
      <PageHeading
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
                onClick={() => setDialog({ kind: 'order' })}
              >
                <PlusIcon size={19} />
                Nuevo pedido
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
          ref={tabListRef}
          variant="line"
          className="max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden mb-5 h-12 w-full justify-start gap-[22px] overflow-x-auto overflow-y-hidden rounded-none border-b border-[#ede6df] p-0 md:mb-[25px] md:gap-[17px] md:overflow-visible tablet:gap-6 wide:gap-[26px]"
        >
          {tabs.map(({ name, icon: Icon }) => (
            <TabsTrigger
              key={name}
              value={name}
              className="h-full flex-none gap-[5px] rounded-none border-0 px-0.5 pt-0 pb-[13px] max-md:px-0 text-xs font-[550] text-[#938086] data-[state=active]:font-[650] data-[state=active]:text-[#44186a] md:gap-2 md:text-sm after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-t-[3px] after:bg-[#542280] data-[state=active]:after:opacity-100 max-md:[&_svg]:size-3.5"
            >
              <Icon size={17} />
              {name}
              {name in badges && (
                <span
                  className="rounded-full bg-[#542280] px-1.5 text-[11px] leading-[18px] font-[650] text-white"
                  aria-label={`${badges[name as keyof typeof badges]} pendientes`}
                >
                  {badges[name as keyof typeof badges]}
                </span>
              )}
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
            suppliers={suppliers}
            supplierId={supplierId}
            onSupplierChange={setSupplierId}
            onLots={(row) =>
              setDialog({ kind: 'lots', productId: row.productId })
            }
            onMinimum={(productId) => setDialog({ kind: 'minimum', productId })}
          />
        </TabsContent>
        <TabsContent value="Por recibir" className="text-base">
          <SupplierOrdersTab
            orders={supplierOrders}
            canManage={canManage}
            onNew={() => setDialog({ kind: 'order' })}
            onDetail={(order) => setDialog({ kind: 'orderDetail', order })}
            onReceive={(order) => setDialog({ kind: 'receiveOrder', order })}
            onCancel={(order) => setDialog({ kind: 'cancelOrder', order })}
          />
        </TabsContent>
        <TabsContent value="Saldos" className="text-base">
          <SupplierPendingsTab
            restock={pendings.restock}
            returns={pendings.returns}
            credits={pendings.credits}
            history={pendings.history}
            suppliers={supplierNames}
            products={labels}
            onReturn={(pending) => setDialog({ kind: 'return', pending })}
            onScrap={(pending) => setDialog({ kind: 'scrap', pending })}
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
        <TabsContent value="Traslados" className="text-base">
          <TransfersTab
            transfers={transfers.transfers}
            manages={manages}
            canSend={canManage && transfers.destinations.length > 0}
            onNew={() => setDialog({ kind: 'transfer' })}
            onReceive={(transfer) => setDialog({ kind: 'receive', transfer })}
            onCancel={(transfer) => setDialog({ kind: 'cancel', transfer })}
          />
        </TabsContent>
      </Tabs>

      {dialog?.kind === 'order' && (
        <OrderDialog
          warehouses={managed}
          initialWarehouseId={selected.id}
          suppliers={suppliers}
          products={pickable}
          canEditProducts={canEditProducts}
          discountable={[...pendings.restock, ...pendings.credits]}
          initialProductId={dialog.productId}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === 'orderDetail' && (
        <OrderDetailDialog
          order={dialog.order}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'receiveOrder' && (
        <ReceptionDialog
          order={dialog.order}
          restock={pendings.restock}
          products={pickable}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'cancelOrder' && (
        <CancelOrderDialog
          order={dialog.order}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'return' && (
        <ReturnDialog
          pending={dialog.pending}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'scrap' && (
        <ScrapDialog pending={dialog.pending} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'count' && (
        <CountDialog
          warehouseId={selected.id}
          products={pickable}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'minimum' && (
        <MinimumDialog
          warehouseId={selected.id}
          products={pickable}
          stock={stock}
          productId={dialog.productId}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'transfer' && (
        <TransferDialog
          from={selected}
          destinations={transfers.destinations}
          products={pickable}
          stock={stock}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'receive' && (
        <ReceiveDialog
          transfer={dialog.transfer}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'cancel' && (
        <CancelTransferDialog
          transfer={dialog.transfer}
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
          canAdjustStock={selected.canAdjustStock}
          removeLotId={dialog?.kind === 'lots' ? dialog.removeLotId : undefined}
          onClose={closeDialog}
        />
      )}
    </div>
  )
}
