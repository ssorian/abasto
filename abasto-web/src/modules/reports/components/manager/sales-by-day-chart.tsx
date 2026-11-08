import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  dailySeries,
  previousRange,
} from '#/modules/reports/lib/manager-chart-data'
import { dayAxisLabel, shortDate } from '#/modules/reports/lib/manager-format'
import { ManagerCard } from '#/modules/reports/components/manager/manager-card'
import type { ManagerDashboard } from '#/modules/reports/types/manager-dashboard'

const config = {
  revenueCents: { label: 'Ventas', color: '#c81d4e' },
  previousCents: { label: 'Periodo anterior', color: '#5b2a86' },
} satisfies ChartConfig

const pesos = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString('es-MX')}`

/** Revenue per day as bars, with the matching day of the previous period as a dashed line. */
export function SalesByDayChart({ data }: { data: ManagerDashboard }) {
  const { range, byDay, summary } = data.sales
  const series = dailySeries(range, byDay, data.previousSales.byDay)
  const before = previousRange(range)
  return (
    <ManagerCard
      title="Ventas por día"
      subtitle={`${shortDate(range.from)} – ${shortDate(range.to)}. Línea punteada: el mismo día del periodo anterior (${shortDate(before.from)} – ${shortDate(before.to)}).`}
    >
      <div className="mb-2.5 flex flex-wrap gap-[18px] text-xs text-ink-row">
        <span className="inline-flex items-center gap-[7px]">
          <b className="block size-[11px] rounded-[3px] bg-[#c81d4e]" />
          Ventas
        </span>
        <span className="inline-flex items-center gap-[7px]">
          <i className="block h-0 w-4 border-t-[3px] border-dashed border-[#5b2a86]" />
          Periodo anterior
        </span>
      </div>
      <ChartContainer
        config={config}
        role="img"
        aria-label={`Ventas por día, de ${shortDate(range.from)} a ${shortDate(range.to)}: ${formatCents(summary.revenueCents)} en total.`}
        className="aspect-auto h-[260px] w-full"
      >
        <ComposedChart data={series} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#f0e9e1" />
          <XAxis
            dataKey="date"
            tickFormatter={dayAxisLabel}
            tickLine={false}
            axisLine={false}
            minTickGap={14}
          />
          <YAxis
            tickFormatter={pesos}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, items) =>
                  shortDate(String(items[0]?.payload.date))
                }
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span>{config[name as keyof typeof config].label}</span>
                    <span className="font-medium tabular-nums">
                      {formatCents(Number(value))}
                    </span>
                  </span>
                )}
              />
            }
          />
          <Bar
            dataKey="revenueCents"
            fill="var(--color-revenueCents)"
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
          />
          <Line
            dataKey="previousCents"
            type="monotone"
            stroke="var(--color-previousCents)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
        </ComposedChart>
      </ChartContainer>
    </ManagerCard>
  )
}
