import { Cell, Pie, PieChart } from 'recharts'

import { ChartContainer, ChartTooltip } from '#/components/ui/chart'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  ChartLegendRow,
  ReportCard,
  groupColors,
} from '#/modules/reports/components/owner/chart-kit'
import type { SupplierShare } from '#/modules/reports/lib/owner-series'

const colorOf = (index: number) =>
  groupColors[Math.min(index, groupColors.length - 1)] ?? '#85909e'

/** Share of the sales by supplier, with each supplier's margin in the legend. */
export function SupplierChart({
  suppliers,
  sentence,
}: {
  suppliers: Array<SupplierShare>
  sentence: string | null
}) {
  return (
    <ReportCard
      title="Ventas por proveedor"
      sentence={sentence}
      description="Parte de las ventas que aporta cada proveedor."
    >
      <ChartLegendRow
        items={suppliers.map((supplier, index) => ({
          label: `${supplier.name} · ${(supplier.shareBps / 100).toFixed(0)} % · ${formatCents(supplier.revenueCents)}`,
          color: colorOf(index),
        }))}
      />
      <ChartContainer
        config={{}}
        className="aspect-auto h-[200px] w-full"
        role="img"
        aria-label="Parte de las ventas por proveedor"
      >
        <PieChart>
          <ChartTooltip
            content={({ active, payload }) => {
              const row = payload[0]?.payload as SupplierShare | undefined
              if (!active || !row) return null
              return (
                <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                  <p className="font-medium">{row.name}</p>
                  <p className="tabular-nums">
                    {formatCents(row.revenueCents)} de ventas
                  </p>
                  <p className="text-muted-foreground tabular-nums">
                    Utilidad {formatCents(row.marginCents)}
                  </p>
                </div>
              )
            }}
          />
          <Pie
            data={suppliers}
            dataKey="revenueCents"
            nameKey="name"
            innerRadius={48}
            outerRadius={80}
            paddingAngle={2}
            isAnimationActive={false}
          >
            {suppliers.map((supplier, index) => (
              <Cell key={supplier.key} fill={colorOf(index)} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    </ReportCard>
  )
}
