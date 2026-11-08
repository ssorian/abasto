import type { ReactNode } from 'react'

import { formatCents } from '#/modules/pricing/lib/money'
import { deltaTone, formatDeltaBps } from '#/modules/executive/lib/format'
import { changeBps } from '#/modules/reports/lib/manager-chart-data'
import { formatMargin } from '#/modules/reports/lib/margin'
import { cn } from '#/lib/utils/cn'
import type { ManagerDashboard } from '#/modules/reports/types/manager-dashboard'

const toneClass = {
  up: 'text-[#1d7a4b]',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
}
const arrow = { up: '▲', down: '▼', flat: '' }

function Kpi({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note: ReactNode
}) {
  return (
    <div className="min-w-0 px-5 py-[18px] md:not-first:border-l md:not-first:border-[#e5e9e2]">
      <div className="text-[11px] text-ink-muted">{label}</div>
      <div className="mt-1.5 text-[23px] font-bold tracking-[-0.7px] text-ink-figure">
        {value}
      </div>
      <div className="mt-[3px] text-[11px] text-muted-foreground">{note}</div>
    </div>
  )
}

/** Sales, profit and ticket of the period, the first one against the days before. */
export function ManagerKpis({ data }: { data: ManagerDashboard }) {
  const { summary } = data.sales
  const change = changeBps(
    summary.revenueCents,
    data.previousSales.summary.revenueCents,
  )
  const tone = deltaTone(change)
  const ticket = summary.orders
    ? Math.round(summary.revenueCents / summary.orders)
    : 0
  return (
    <div className="grid grid-cols-2 rounded-xl border border-[#f0e9e1] bg-white md:grid-cols-4">
      <Kpi
        label="Ventas del periodo"
        value={formatCents(summary.revenueCents)}
        note={
          change === null ? (
            'Sin ventas en el periodo anterior'
          ) : (
            <>
              <span className={cn('font-medium', toneClass[tone])}>
                {arrow[tone]} {formatDeltaBps(change, '%')}
              </span>{' '}
              vs. periodo anterior
            </>
          )
        }
      />
      <Kpi
        label="Utilidad bruta"
        value={formatCents(summary.marginCents)}
        note={`Margen ${formatMargin(summary.marginCents, summary.revenueCents)}`}
      />
      <Kpi
        label="Ticket promedio"
        value={formatCents(ticket)}
        note={`${summary.orders} ${summary.orders === 1 ? 'ticket' : 'tickets'}`}
      />
      <Kpi
        label="Unidades vendidas"
        value={summary.units.toLocaleString('es-MX')}
        note="Unidades base entregadas"
      />
    </div>
  )
}
