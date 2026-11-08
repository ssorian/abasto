import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip } from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import type { InventoryValue } from '#/modules/executive/types/inventory'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  MoneyTooltip,
  ReportCard,
  chartColors,
} from '#/modules/reports/components/owner/chart-kit'
import { compactMoney } from '#/modules/reports/lib/owner-series'

const config = {
  valueCents: { label: 'Valor a costo', color: chartColors.profit },
} satisfies ChartConfig

/** Stock valued at cost, per warehouse. */
export function InventoryChart({ inventory }: { inventory: InventoryValue }) {
  return (
    <ReportCard
      title="Inventario a costo"
      description={`Total ${formatCents(inventory.totalCents)}, existencias actuales al costo de cada lote.`}
    >
      <ChartContainer
        config={config}
        className="aspect-auto h-[220px] w-full"
        role="img"
        aria-label="Valor del inventario a costo por almacén"
      >
        <BarChart
          data={inventory.warehouses}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#f0e9e1" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={compactMoney}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <ChartTooltip content={<MoneyTooltip />} />
          <Bar
            dataKey="valueCents"
            fill="var(--color-valueCents)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </ReportCard>
  )
}
