import { Truck } from 'lucide-react'
import { useState } from 'react'

import {
  orderChannels,
  orderStatusFilters,
} from '#/modules/counter/lib/constants'
import {
  CompactInput,
  CompactSelect,
} from '#/modules/counter/components/form-controls'
import { EmptyState } from '#/modules/counter/components/empty-state'
import { InfoBanner } from '#/modules/counter/components/info-banner'
import { OrderCard } from '#/modules/counter/components/order-card'
import { OrderDetailDialog } from '#/modules/counter/components/order-detail-dialog'
import { PaymentDialog } from '#/modules/counter/components/payment-dialog'

import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type { CounterState } from '#/modules/counter/types/counter'

/** Searchable, filterable list of sales and deliveries with their operations. */
export function OperationsOrders({
  state,
  apply,
}: {
  state: CounterState
  apply: ApplyOperation
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [status, setStatus] = useState('Todos')
  const [channel, setChannel] = useState('Todos')
  const [search, setSearch] = useState('')

  const selected = state.orders.find((order) => order.id === selectedId)
  const payment = state.orders.find((order) => order.id === paymentId)
  const needle = search.toLowerCase()
  const rows = state.orders.filter(
    (order) =>
      (status === 'Todos' || order.status === status) &&
      (channel === 'Todos' || order.channel === channel) &&
      `${order.id} ${order.customer}`.toLowerCase().includes(needle),
  )

  return (
    <>
      <InfoBanner
        icon={Truck}
        title="Reserva → preparación → entrega → cobro"
        className="mb-[22px]"
      >
        Las cantidades pendientes permanecen reservadas. Sólo las entregadas
        aparecen como venta en Reportes.
      </InfoBanner>

      <div className="my-5 flex flex-wrap gap-3">
        <CompactInput
          placeholder="Buscar pedido o cliente…"
          aria-label="Buscar pedido"
          value={search}
          className="basis-full md:flex-1 md:basis-0"
          onChange={(event) => setSearch(event.target.value)}
        />
        <CompactSelect
          aria-label="Estado del pedido"
          value={status}
          className="min-w-[120px] flex-1 md:min-w-40 md:flex-none"
          onChange={(event) => setStatus(event.target.value)}
        >
          {orderStatusFilters.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </CompactSelect>
        <CompactSelect
          aria-label="Canal del pedido"
          value={channel}
          className="min-w-[120px] flex-1 md:min-w-40 md:flex-none"
          onChange={(event) => setChannel(event.target.value)}
        >
          <option>Todos</option>
          {orderChannels.map((option) => (
            <option key={option}>{option}</option>
          ))}
          <option>Sin registrar</option>
        </CompactSelect>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {rows.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onOpen={() => setSelectedId(order.id)}
          />
        ))}
      </div>
      {!rows.length && (
        <EmptyState>No hay pedidos con estos filtros.</EmptyState>
      )}

      {selected && (
        <OrderDetailDialog
          state={state}
          order={selected}
          apply={apply}
          onClose={() => setSelectedId(null)}
          onPay={() => setPaymentId(selected.id)}
        />
      )}
      {payment && (
        <PaymentDialog
          key={payment.id}
          state={state}
          order={payment}
          apply={apply}
          onDone={() => setPaymentId(null)}
        />
      )}
    </>
  )
}
