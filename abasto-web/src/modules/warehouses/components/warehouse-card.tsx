import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, Warehouse } from 'lucide-react'

import { EXPIRY_WARNING_DAYS } from '#/modules/inventory/lib/stock-metrics'
import type { WarehouseWithMetrics } from '#/modules/warehouses/server/warehouses'

function Metric({
  label,
  value,
  alert = false,
}: {
  label: string
  value: number
  alert?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd
        className={`text-lg font-[650] tracking-[-0.4px] ${alert && value > 0 ? 'text-[#b26357]' : ''}`}
      >
        {value.toLocaleString('es-MX')}
      </dd>
    </div>
  )
}

export function WarehouseCard({
  warehouse,
  number,
}: {
  warehouse: WarehouseWithMetrics
  /** Two-digit position shown as the card art number, e.g. "01". */
  number: string
}) {
  const { metrics } = warehouse
  return (
    <article className="flex overflow-hidden rounded-[13px] border border-[#eee7e0] bg-white tablet:block">
      <div className="flex w-[95px] shrink-0 flex-col items-center justify-center gap-[5px] bg-[#f7f1ea] p-5 text-[#8f707a] md:w-[150px] md:p-[25px] tablet:h-[146px] tablet:w-auto tablet:flex-row tablet:justify-between tablet:gap-0 tablet:p-[35px]">
        <Warehouse className="w-[37px] md:w-auto" size={47} aria-hidden />
        <span className="text-[44px] font-[750] tracking-[-4px] text-[#ded6e4] md:text-[62px]">
          {number}
        </span>
      </div>

      <div className="flex-1 px-4 py-5 md:p-5 wide:p-6">
        <span className="text-xs leading-normal font-bold tracking-[1.5px] text-ink-eyebrow">
          ALMACÉN
        </span>
        <h2 className="mt-2 text-xl font-[650] tracking-[-0.5px] md:text-[21px] tablet:text-[23px]">
          {warehouse.name}
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <Metric
            label="Productos con existencias"
            value={metrics.productsWithStock}
          />
          <Metric label="Unidades en total" value={metrics.totalUnits} />
          <Metric label="Bajo el mínimo" value={metrics.belowMinimum} alert />
          <Metric
            label={`Lotes por vencer (${EXPIRY_WARNING_DAYS} días)`}
            value={metrics.expiringLots}
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
      </div>
    </article>
  )
}
