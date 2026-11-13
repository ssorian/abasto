import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { PageHeading } from '#/components/page-heading'
import { CashPanel } from '#/modules/cash/components/cash-panel'
import { ActionButton } from '#/modules/counter/components/action-button'
import { FieldSelect } from '#/modules/counter/components/form-controls'
import { NewOrderDialog } from '#/modules/counter/components/new-order-dialog'
import { OrderList } from '#/modules/counter/components/order-list'
import { OrderViewDialog } from '#/modules/counter/components/order-view-dialog'
import { ReservationSetting } from '#/modules/counter/components/reservation-setting'
import {
  defaultStatusFilter,
  filterOrders,
  orderStatusFilters,
  statusCounts,
} from '#/modules/counter/lib/order-status'
import type { StatusFilter } from '#/modules/counter/lib/order-status'
import type { CounterOverview } from '#/modules/counter/types/counter-view'
import { cn } from '#/lib/utils/cn'
import { hasWarehouseChoice } from '#/modules/warehouses/lib/warehouse-choice'

type CounterPageProps = {
  overview: CounterOverview
  onSelectWarehouse: (warehouseId: string) => void
}

export function CounterPage({ overview, onSelectWarehouse }: CounterPageProps) {
  const [filter, setFilter] = useState<StatusFilter>(defaultStatusFilter)
  const [composing, setComposing] = useState(false)
  const [openId, setOpenId] = useState<string>()
  const selected = overview.warehouses.find(
    ({ id }) => id === overview.selectedId,
  )

  const heading = (
    <PageHeading
      title="Ventas"
      description="Reserva y entrega los pedidos de tus clientes."
      actions={
        selected && (
          <ActionButton tone="primary" onClick={() => setComposing(true)}>
            <PlusIcon size={19} />
            Nuevo pedido
          </ActionButton>
        )
      }
    />
  )
  if (!selected) {
    return (
      <>
        {heading}
        <p className="text-sm text-ink-muted">
          Aún no tienes almacenes asignados.
        </p>
      </>
    )
  }

  const orders = filterOrders(overview.orders, filter)
  const counts = statusCounts(overview.orders)

  return (
    <>
      {heading}
      <div className="mb-5 flex flex-wrap items-end gap-4">
        {hasWarehouseChoice(overview.warehouses) ? (
          <label className="flex min-w-[220px] flex-col gap-[7px] text-[13px] font-medium text-[#513f45]">
            Almacén
            <FieldSelect
              value={selected.id}
              onChange={(event) => {
                setFilter(defaultStatusFilter)
                onSelectWarehouse(event.target.value)
              }}
            >
              {overview.warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </FieldSelect>
          </label>
        ) : (
          <p className="flex min-w-[220px] flex-col gap-[7px] text-[13px] font-medium text-[#513f45]">
            Almacén
            <span className="text-sm font-[650] text-[#442460]">
              {selected.name}
            </span>
          </p>
        )}
        <div
          role="group"
          aria-label="Filtrar por estado"
          className="flex flex-wrap gap-2"
        >
          {orderStatusFilters.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
              className={cn(
                'rounded-full border border-[#e8e1e3] bg-white px-3.5 py-2 text-[13px] text-[#866a73]',
                filter === status &&
                  'border-transparent bg-primary font-[650] text-brand-ink',
              )}
            >
              {status} ({counts[status]})
            </button>
          ))}
        </div>
      </div>
      <CashPanel
        warehouseId={selected.id}
        warehouseName={selected.name}
        cash={overview.cash}
        canViewHistory={overview.canViewCashHistory}
      />
      {overview.canSetHours && (
        <ReservationSetting
          key={overview.reservationHours}
          hours={overview.reservationHours}
        />
      )}
      <OrderList orders={orders} now={overview.now} onOpen={setOpenId} />
      {composing && (
        <NewOrderDialog
          key={selected.id}
          warehouseId={selected.id}
          warehouseName={selected.name}
          customers={overview.customers}
          sellable={overview.sellable}
          reservationHours={overview.reservationHours}
          onClose={() => setComposing(false)}
          onCreated={setOpenId}
        />
      )}
      {openId && (
        <OrderViewDialog
          key={openId}
          orderId={openId}
          now={overview.now}
          drawerOpen={overview.cash !== null}
          onClose={() => setOpenId(undefined)}
        />
      )}
    </>
  )
}
