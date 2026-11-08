import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip } from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import { formatCents } from '#/modules/pricing/lib/money'
import type { MarginRow } from '#/modules/executive/types/profitability'
import {
  ReportCard,
  chartColors,
} from '#/modules/reports/components/owner/chart-kit'
import { compactMoney } from '#/modules/reports/lib/owner-series'

const config = {
  marginCents: { label: 'Utilidad bruta', color: chartColors.profit },
} satisfies ChartConfig

/** Most profitable products of the period, longest bar first. */
export function TopProductsChart({
  rows,
  sentence,
}: {
  rows: Array<MarginRow>
  sentence: string | null
}) {
  return (
    <ReportCard
      title="Top 10 productos por utilidad"
      sentence={sentence}
      description="Utilidad bruta del periodo, de mayor a menor."
    >
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height: Math.max(rows.length, 3) * 34 + 30 }}
        role="img"
        aria-label="Los diez productos con más utilidad bruta del periodo"
      >
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="#f0e9e1" />
          <XAxis
            type="number"
            tickFormatter={compactMoney}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tickLine={false}
            axisLine={false}
            tickFormatter={(name: string) =>
              name.length > 22 ? `${name.slice(0, 21)}…` : name
            }
          />
          <ChartTooltip
            content={({ active, payload }) => {
              const row = payload[0]?.payload as MarginRow | undefined
              if (!active || !row) return null
              return (
                <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                  <p className="font-medium">{row.name}</p>
                  <p className="tabular-nums">
                    {formatCents(row.marginCents)} de utilidad
                  </p>
                  <p className="text-muted-foreground">
                    Margen{' '}
                    {row.marginBps === null
                      ? '—'
                      : `${(row.marginBps / 100).toFixed(1)} %`}
                  </p>
                </div>
              )
            }}
          />
          <Bar
            dataKey="marginCents"
            fill="var(--color-marginCents)"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </ReportCard>
  )
}
