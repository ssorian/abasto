import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip } from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import {
  ChartLegendRow,
  MoneyTooltip,
  ReportCard,
  chartColors,
} from '#/modules/reports/components/owner/chart-kit'
import { compactMoney, shortDay } from '#/modules/reports/lib/owner-series'
import type { DailyPoint } from '#/modules/reports/lib/owner-series'

const config = {
  revenueCents: { label: 'Ventas', color: chartColors.sales },
  marginCents: { label: 'Utilidad bruta', color: chartColors.profit },
  previousRevenueCents: {
    label: 'Ventas periodo anterior',
    color: chartColors.previous,
  },
} satisfies ChartConfig

/** Sales and gross profit per day, with last period's sales as a dashed line. */
export function TrendChart({ days }: { days: Array<DailyPoint> }) {
  return (
    <ReportCard
      title="Ventas y utilidad por día"
      description="Línea punteada: ventas del periodo anterior."
    >
      <ChartLegendRow
        items={[
          { label: 'Ventas', color: chartColors.sales, line: true },
          { label: 'Utilidad bruta', color: chartColors.profit, line: true },
          {
            label: 'Ventas periodo anterior',
            color: chartColors.previous,
            line: true,
            dashed: true,
          },
        ]}
      />
      <ChartContainer
        config={config}
        className="aspect-auto h-[280px] w-full"
        role="img"
        aria-label="Ventas y utilidad bruta por día, contra las ventas del periodo anterior"
      >
        <LineChart
          data={days}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#f0e9e1" />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={compactMoney}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <ChartTooltip
            content={
              <MoneyTooltip
                labelFormatter={(label) => shortDay(String(label))}
              />
            }
          />
          <Line
            dataKey="previousRevenueCents"
            stroke="var(--color-previousRevenueCents)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="revenueCents"
            stroke="var(--color-revenueCents)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="marginCents"
            stroke="var(--color-marginCents)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </ReportCard>
  )
}
