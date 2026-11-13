import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'

import { EXPIRY_WARNING_DAYS } from '#/modules/inventory/lib/stock-metrics'
import { isAlertMetric } from '#/modules/warehouses/lib/card-metrics'
import type { WarehouseWithMetrics } from '#/modules/warehouses/server/warehouses'

type MetricProps = {
  label: string
  value: number
  warehouseId: string
  /** Reads as an alert (and links to the warehouse's inventory) above zero. */
  alert?: boolean
}

function Metric({ label, value, warehouseId, alert = false }: MetricProps) {
  const active = isAlertMetric(value, alert)
  const content = (
    <>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd
        className={`text-lg font-[650] tracking-[-0.4px] ${active ? 'text-[#b26357]' : ''}`}
      >
        {value.toLocaleString('es-MX')}
        {active && (
          <ArrowRightIcon size={14} className="ml-1 inline" aria-hidden />
        )}
      </dd>
    </>
  )
  if (!active) return <div>{content}</div>
  return (
    <Link
      to="/inventario"
      search={{ almacen: warehouseId }}
      aria-label={`${label}: ${value}. Ver inventario de este almacén`}
      className="-m-1 block rounded-md bg-[#fbeeeb] p-1 hover:underline"
    >
      {content}
    </Link>
  )
}

export function WarehouseCard({
  warehouse,
}: {
  warehouse: WarehouseWithMetrics
}) {
  const { metrics } = warehouse
  return (
    <article className="rounded-[13px] border border-[#eee7e0] bg-white px-4 py-5 md:p-5 wide:p-6">
      <h2 className="text-xl font-[650] tracking-[-0.5px] md:text-[21px]">
        {warehouse.name}
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric
          label="Productos con existencias"
          value={metrics.productsWithStock}
          warehouseId={warehouse.id}
        />
        <Metric
          label="Unidades en total"
          value={metrics.totalUnits}
          warehouseId={warehouse.id}
        />
        <Metric
          label="Bajo el mínimo"
          value={metrics.belowMinimum}
          warehouseId={warehouse.id}
          alert
        />
        <Metric
          label={`Lotes por vencer (${EXPIRY_WARNING_DAYS} días)`}
          value={metrics.expiringLots}
          warehouseId={warehouse.id}
          alert
        />
      </dl>
      {metrics.expiredLots > 0 && (
        <p className="mt-3 text-xs text-[#b26357]">
          {metrics.expiredLots === 1
            ? '1 lote ya venció.'
            : `${metrics.expiredLots} lotes ya vencieron.`}
        </p>
      )}
      <Link
        to="/inventario"
        search={{ almacen: warehouse.id }}
        className="mt-4 inline-flex items-center gap-[7px] text-sm font-[650] text-ink-link hover:underline"
      >
        Ver inventario <ArrowRightIcon size={15} />
      </Link>
    </article>
  )
}
