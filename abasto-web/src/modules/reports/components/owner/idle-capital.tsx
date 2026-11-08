import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip } from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import { defaultNonMovingDays } from '#/modules/executive/lib/search'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import { NON_MOVING_DAYS } from '#/modules/executive/types/inventory'
import type { NonMovingCapital } from '#/modules/executive/types/inventory'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  MoneyTooltip,
  ReportCard,
  chartColors,
} from '#/modules/reports/components/owner/chart-kit'
import { FieldSelect } from '#/modules/reports/components/report-fields'
import {
  CellNote,
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import {
  compactMoney,
  nonMovingBuckets,
} from '#/modules/reports/lib/owner-series'

const config = {
  valueCents: { label: 'Capital sin venta', color: chartColors.idle30 },
} satisfies ChartConfig

const bucketColors = {
  '30': chartColors.idle30,
  '60': chartColors.idle60,
  '90': chartColors.idle90,
}

const shown = 5

/** Money tied up in stock with no sale, by how long it has sat. */
export function IdleCapital({
  nonMoving,
  sentence,
  onChange,
}: {
  nonMoving: NonMovingCapital
  sentence: string
  onChange: (patch: Partial<ExecutiveSearch>) => void
}) {
  const buckets = nonMovingBuckets(nonMoving.rows)
  const top = [...nonMoving.rows]
    .sort((a, b) => b.valueCents - a.valueCents)
    .slice(0, shown)
  return (
    <ReportCard
      title="Capital sin venta"
      sentence={sentence}
      description={`${formatCents(nonMoving.totalCents)} a costo en producto sin venta en los últimos ${nonMoving.days} días.`}
      action={
        <FieldSelect
          aria-label="Días sin venta"
          value={nonMoving.days}
          onChange={(event) => {
            const days = NON_MOVING_DAYS.find(
              (item) => item === Number(event.target.value),
            )
            onChange({
              sinventa: days === defaultNonMovingDays ? undefined : days,
            })
          }}
        >
          {NON_MOVING_DAYS.map((days) => (
            <option key={days} value={days}>
              {days} días
            </option>
          ))}
        </FieldSelect>
      }
    >
      <ChartContainer
        config={config}
        className="aspect-auto h-[180px] w-full"
        role="img"
        aria-label="Capital sin venta por días sin vender"
      >
        <BarChart
          data={buckets}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#f0e9e1" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={compactMoney}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <ChartTooltip content={<MoneyTooltip />} />
          <Bar
            dataKey="valueCents"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {buckets.map((bucket) => (
              <Cell key={bucket.key} fill={bucketColors[bucket.key]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      {top.length > 0 && (
        <TableWrap bordered className="mt-3.5">
          <DataTable>
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th className="text-right">Valor</Th>
              </tr>
            </thead>
            <tbody>
              {top.map((row) => (
                <Row key={`${row.warehouseId}-${row.productId}`}>
                  <Td>
                    {row.name}
                    <CellNote>
                      {row.warehouseName} ·{' '}
                      {row.daysSinceLastSale === null
                        ? 'sin ventas en este almacén'
                        : `${row.daysSinceLastSale} días sin venta`}
                    </CellNote>
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatCents(row.valueCents)}
                  </Td>
                </Row>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
    </ReportCard>
  )
}
