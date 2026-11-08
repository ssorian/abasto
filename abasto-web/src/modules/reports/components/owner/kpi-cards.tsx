import { Line, LineChart } from 'recharts'

import { ChartContainer } from '#/components/ui/chart'
import { formatDeltaBps } from '#/modules/executive/lib/format'
import type {
  WarehouseMetrics,
  WarehouseRankingRow,
} from '#/modules/executive/types/profitability'
import { formatCents } from '#/modules/pricing/lib/money'
import { DeltaText } from '#/modules/reports/components/owner/delta-text'
import { chartColors } from '#/modules/reports/components/owner/chart-kit'
import {
  averageTicketSentence,
  marginSentence,
  profitSentence,
  salesSentence,
  ticketsSentence,
} from '#/modules/reports/lib/owner-narrative'
import { relativeChangeBps } from '#/modules/reports/lib/owner-series'
import type { DailyPoint } from '#/modules/reports/lib/owner-series'

type KpiCardsProps = {
  current: WarehouseMetrics
  previous: WarehouseMetrics
  days: Array<DailyPoint>
  rows: Array<WarehouseRankingRow>
}

type Card = {
  label: string
  value: string
  delta: { value: number | null; label: string }
  sentence: string
  trend: Array<number>
  color: string
}

const relative = (current: number, previous: number) => {
  const bps = relativeChangeBps(current, previous)
  return { value: bps, label: formatDeltaBps(bps, '%') }
}

function Sparkline({
  values,
  color,
}: {
  values: Array<number>
  color: string
}) {
  const data = values.map((value, index) => ({ index, value }))
  return (
    <ChartContainer
      config={{ value: { color } }}
      className="aspect-auto h-10 w-full"
      aria-hidden
    >
      <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
        <Line
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

/** The five headline figures, each with its change, trend line and a sentence. */
export function KpiCards({ current, previous, days, rows }: KpiCardsProps) {
  const marginChange =
    current.marginBps === null || previous.marginBps === null
      ? null
      : current.marginBps - previous.marginBps
  const cards: Array<Card> = [
    {
      label: 'Ventas',
      value: formatCents(current.revenueCents),
      delta: relative(current.revenueCents, previous.revenueCents),
      sentence: salesSentence(current, previous),
      trend: days.map((day) => day.revenueCents),
      color: chartColors.sales,
    },
    {
      label: 'Utilidad bruta',
      value: formatCents(current.marginCents),
      delta: relative(current.marginCents, previous.marginCents),
      sentence: profitSentence(current, previous, rows),
      trend: days.map((day) => day.marginCents),
      color: chartColors.profit,
    },
    {
      label: 'Margen',
      value:
        current.marginBps === null
          ? '—'
          : `${(current.marginBps / 100).toFixed(1)} %`,
      delta: { value: marginChange, label: formatDeltaBps(marginChange, 'pp') },
      sentence: marginSentence(current, previous),
      trend: days.map((day) =>
        day.revenueCents ? day.marginCents / day.revenueCents : 0,
      ),
      color: chartColors.profit,
    },
    {
      label: 'Tickets',
      value: new Intl.NumberFormat('es-MX').format(current.tickets),
      delta: relative(current.tickets, previous.tickets),
      sentence: ticketsSentence(current, previous),
      trend: days.map((day) => day.orders),
      color: chartColors.sales,
    },
    {
      label: 'Ticket promedio',
      value: formatCents(current.averageTicketCents),
      delta: relative(current.averageTicketCents, previous.averageTicketCents),
      sentence: averageTicketSentence(current, previous),
      trend: days.map((day) => day.averageTicketCents),
      color: chartColors.sales,
    },
  ]
  return (
    <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 min-[1280px]:grid-cols-5">
      {cards.map((card) => (
        <article
          key={card.label}
          className="min-w-0 rounded-xl border border-[#f0e9e1] bg-white px-5 py-[18px]"
        >
          <h2 className="text-[11px] font-normal text-ink-muted">
            {card.label}
          </h2>
          <p className="mt-2 text-[23px] font-bold tracking-[-0.7px] text-ink-figure">
            {card.value}
          </p>
          <p className="mt-1.5 text-xs">
            <DeltaText value={card.delta.value} label={card.delta.label} />{' '}
            <span className="text-[11px] text-ink-muted">vs. anterior</span>
          </p>
          <div className="mt-2.5">
            <Sparkline values={card.trend} color={card.color} />
          </div>
          <p className="mt-2 text-xs leading-[1.5] text-ink-row">
            {card.sentence}
          </p>
        </article>
      ))}
    </div>
  )
}
