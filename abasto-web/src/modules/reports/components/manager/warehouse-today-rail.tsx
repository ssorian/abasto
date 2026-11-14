import { Link } from '@tanstack/react-router'

import { cn } from '#/lib/utils/cn'
import type { SupplierOrderSummary } from '#/modules/inventory/services/supplier-order-reads'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  ColumnHeading,
  Figure,
  Panel,
} from '#/modules/reports/components/owner/owner-panel'
import { timeLabel } from '#/modules/reports/lib/manager-format'
import { shortDay } from '#/modules/reports/lib/owner-series'
import type { ManagerDashboard } from '#/modules/reports/types/manager-dashboard'
import type { StockAlerts } from '#/modules/reports/types/reports'

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`
const card = 'border-[#e6dbef] px-[18px] py-4'
const link = 'text-[13px] font-[650] text-ink-link hover:underline'
const sumValue = (lots: StockAlerts['expired']) =>
  lots.reduce((sum, lot) => sum + lot.valueCents, 0)

/** The warehouse right now, apart from the period: drawer, stock, orders. */
export function WarehouseTodayRail({ data }: { data: ManagerDashboard }) {
  return (
    <aside
      aria-labelledby="reportes-hoy"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl bg-secondary p-3.5"
    >
      <div className="px-2 pt-1">
        <ColumnHeading
          id="reportes-hoy"
          title="Tu almacén hoy"
          note="no cambia con el periodo"
        />
      </div>
      <OpenCash rows={data.cash.rows} />
      <Attention stock={data.stock} warehouseId={data.warehouse.id} />
      <PendingOrders
        orders={data.pendingOrders}
        warehouseId={data.warehouse.id}
      />
    </aside>
  )
}

function OpenCash({ rows }: { rows: ManagerDashboard['cash']['rows'] }) {
  const open = rows.find((row) => row.status === 'open')
  return (
    <Panel className={card}>
      {open ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-muted-foreground">
              Caja, esperado ahora
            </span>
            <span className="rounded-full bg-[#e6f3ec] px-[9px] py-0.5 text-xs font-[650] text-[#1d7a4b]">
              Abierta {timeLabel(open.openedAt)}
            </span>
          </div>
          <Figure
            label=""
            size="lg"
            value={formatCents(open.expectedCents)}
            note="Lo que debe haber al contar en este momento."
          />
        </>
      ) : (
        <Figure
          label="Caja"
          size="lg"
          tone="quiet"
          value="Cerrada"
          note="No hay un turno de caja abierto."
        />
      )}
      <Link to="/mostrador" className={cn(link, 'mt-2 inline-block')}>
        Ir a la caja
      </Link>
    </Panel>
  )
}

function Attention({
  stock,
  warehouseId,
}: {
  stock: StockAlerts
  warehouseId: string
}) {
  const { expired, expiring, lowStock, expiringDays } = stock
  const next = expiring.reduce<string | undefined>(
    (first, lot) => (!first || lot.expiresOn < first ? lot.expiresOn : first),
    undefined,
  )
  const [firstLow] = lowStock
  const items = [
    expired.length > 0 && {
      key: 'expired',
      urgent: true,
      title: `${plural(expired.length, 'lote vencido', 'lotes vencidos')} con existencia`,
      note: `${formatCents(sumValue(expired))} a costo · retíralos de la venta`,
    },
    expiring.length > 0 && {
      key: 'expiring',
      urgent: false,
      title: `${plural(expiring.length, 'lote caduca', 'lotes caducan')} en ${expiringDays} días`,
      note: `${formatCents(sumValue(expiring))} a costo${next ? ` · el más próximo, ${shortDay(next)}` : ''}`,
    },
    lowStock.length > 0 && {
      key: 'low',
      urgent: false,
      title: `${plural(lowStock.length, 'producto', 'productos')} con stock bajo`,
      note:
        lowStock.length === 1
          ? `${firstLow.name} · ${firstLow.available} de mínimo ${firstLow.minimum}`
          : lowStock
              .slice(0, 3)
              .map((row) => row.name)
              .join(', ') + (lowStock.length > 3 ? '…' : ''),
    },
  ].filter((item) => !!item)
  return (
    <Panel className={card}>
      <h3 className="mb-1 text-[15px] font-[650] text-ink-figure">
        Requiere atención
      </h3>
      {items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Sin lotes por caducar ni productos con stock bajo.
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-2.5 border-b border-[#f4ede3] py-2.5 first:pt-1 last:border-b-0 last:pb-0"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-px grid size-[22px] flex-none place-items-center rounded-full text-xs font-extrabold',
                  item.urgent
                    ? 'bg-[#fbeae7] text-destructive'
                    : 'bg-[#fff0d1] text-[#7a5714]',
                )}
              >
                !
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block text-[13px] font-[650] text-ink-figure">
                  {item.title}
                </strong>
                <small className="block text-xs text-muted-foreground">
                  {item.note}
                </small>
              </div>
              <Link
                to="/inventario"
                search={{ almacen: warehouseId }}
                aria-label={`Ver en inventario: ${item.title}`}
                className={cn(link, 'py-0.5')}
              >
                Ver
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function PendingOrders({
  orders,
  warehouseId,
}: {
  orders: Array<SupplierOrderSummary>
  warehouseId: string
}) {
  return (
    <Panel className={card}>
      <h3 className="mb-1 text-[15px] font-[650] text-ink-figure">
        Pedidos por recibir
      </h3>
      {orders.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No hay pedidos pendientes con proveedores.
        </p>
      ) : (
        <ul className="grid gap-[5px] text-[13px] text-ink-row">
          {orders.map((order) => (
            <li key={order.id} className="flex justify-between gap-2">
              <span className="min-w-0">
                {order.supplierName} ·{' '}
                {order.expectedOn
                  ? `llega el ${shortDay(order.expectedOn)}`
                  : `pedido del ${shortDay(order.purchasedOn)}`}
              </span>
              <span className="tabular-nums">
                {formatCents(order.totalCostCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/inventario"
        search={{ almacen: warehouseId }}
        className={cn(link, 'mt-2 inline-block')}
      >
        Ver pedidos a proveedor
      </Link>
    </Panel>
  )
}
