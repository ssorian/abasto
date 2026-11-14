import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { cn } from '#/lib/utils/cn'
import { formatBpsPercent } from '#/modules/executive/lib/format'
import { defaultNonMovingDays } from '#/modules/executive/lib/search'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import { NON_MOVING_DAYS } from '#/modules/executive/types/inventory'
import type {
  InventoryValue,
  NonMovingCapital,
} from '#/modules/executive/types/inventory'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  ColumnHeading,
  Figure,
  Panel,
} from '#/modules/reports/components/owner/owner-panel'
import { TextLink } from '#/modules/reports/components/report-buttons'
import { shortDay, stockAlertSummary } from '#/modules/reports/lib/owner-series'
import { shareBps } from '#/modules/reports/lib/owner-view'
import type { StockAlerts } from '#/modules/reports/types/reports'

type InventoryRailProps = {
  inventory: InventoryValue
  nonMoving: NonMovingCapital
  stockAlerts: StockAlerts
  onSearch: (patch: Partial<ExecutiveSearch>) => void
}

const topIdle = 5
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`
const card = 'border-[#e6dbef] px-[18px] py-4'

/** Today's stock, apart from the period: what it is worth and what needs a look. */
export function InventoryRail({
  inventory,
  nonMoving,
  stockAlerts,
  onSearch,
}: InventoryRailProps) {
  const warehouses = [...inventory.warehouses].sort(
    (a, b) => b.valueCents - a.valueCents,
  )
  return (
    <aside
      aria-labelledby="reportes-inventario"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl bg-secondary p-3.5"
    >
      <div className="px-2 pt-1">
        <ColumnHeading
          id="reportes-inventario"
          title="Inventario hoy"
          note="no cambia con el periodo"
        />
      </div>
      <Panel className={card}>
        <Figure
          label="Valor a costo"
          size="lg"
          value={formatCents(inventory.totalCents)}
        />
        {warehouses.length > 1 && (
          <ul className="mt-2.5 grid gap-[5px] text-[13px] text-ink-row">
            {warehouses.map((warehouse) => (
              <li key={warehouse.id} className="flex justify-between gap-2">
                <span>{warehouse.name}</span>
                <span className="tabular-nums">
                  {formatCents(warehouse.valueCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Attention stockAlerts={stockAlerts} />
      <IdleStock
        nonMoving={nonMoving}
        inventoryCents={inventory.totalCents}
        onSearch={onSearch}
      />
    </aside>
  )
}

function Attention({ stockAlerts }: { stockAlerts: StockAlerts }) {
  const summary = stockAlertSummary(stockAlerts)
  const expired = stockAlerts.expired.length
  const items = [
    expired > 0 && {
      key: 'expired',
      urgent: true,
      title: `${plural(expired, 'lote vencido', 'lotes vencidos')} con existencia`,
      note: 'Sácalos de la venta.',
    },
    summary.expiringCount > 0 && {
      key: 'expiring',
      urgent: true,
      title: `${plural(summary.expiringCount, 'lote caduca', 'lotes caducan')} en ${stockAlerts.expiringDays} días`,
      note: `${formatCents(summary.expiringValueCents)} a costo${summary.nextExpiry ? ` · el más próximo, ${shortDay(summary.nextExpiry)}` : ''}`,
    },
    summary.lowStockCount > 0 && {
      key: 'low',
      urgent: false,
      title: `${plural(summary.lowStockCount, 'producto', 'productos')} con stock bajo`,
      note: summary.lowStockByWarehouse.map((item) => item.name).join(', '),
    },
  ].filter((item) => item !== false)
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
                aria-label={`Ver en inventario: ${item.title}`}
                className="py-0.5 text-[13px] font-[650] text-ink-link hover:underline"
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

function IdleStock({
  nonMoving,
  inventoryCents,
  onSearch,
}: {
  nonMoving: NonMovingCapital
  inventoryCents: number
  onSearch: (patch: Partial<ExecutiveSearch>) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const sorted = [...nonMoving.rows].sort((a, b) => b.valueCents - a.valueCents)
  const rows = showAll ? sorted : sorted.slice(0, topIdle)
  return (
    <Panel className={card}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-[650] text-ink-figure">Sin venta</h3>
        <select
          aria-label="Días sin venta"
          value={nonMoving.days}
          onChange={(event) => {
            const days = NON_MOVING_DAYS.find(
              (item) => item === Number(event.target.value),
            )
            onSearch({
              sinventa: days === defaultNonMovingDays ? undefined : days,
            })
          }}
          className="min-h-8 rounded-[9px] border border-input bg-white px-2 py-[3px] text-xs text-ink-row"
        >
          {NON_MOVING_DAYS.map((days) => (
            <option key={days} value={days}>
              en {days} días
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 text-2xl leading-[1.15] font-bold tracking-[-0.8px] text-ink-figure tabular-nums">
        {formatCents(nonMoving.totalCents)}
      </div>
      <p className="mt-[3px] text-xs text-muted-foreground">
        {nonMoving.totalCents === 0
          ? 'Todo el inventario tuvo venta.'
          : `${formatBpsPercent(shareBps(nonMoving.totalCents, inventoryCents))} del inventario está detenido`}
      </p>
      {rows.length > 0 && (
        <ul className="mt-2.5 text-[13px] text-ink-row">
          {rows.map((row) => (
            <li
              key={`${row.warehouseId}-${row.productId}`}
              className="flex justify-between gap-3 border-t border-[#f4ede3] py-[7px]"
            >
              <span className="min-w-0 truncate" title={row.name}>
                {row.name}
              </span>
              <span className="tabular-nums">
                {formatCents(row.valueCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {sorted.length > topIdle && (
        <TextLink
          className="mt-2 text-[13px]"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll
            ? `Ver solo los ${topIdle} mayores`
            : `Ver los ${sorted.length} productos`}
        </TextLink>
      )}
    </Panel>
  )
}
