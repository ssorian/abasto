import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip } from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import { formatDeltaBps } from '#/modules/executive/lib/format'
import type { WarehouseRankingRow } from '#/modules/executive/types/profitability'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  ChartLegendRow,
  MoneyTooltip,
  ReportCard,
  chartColors,
} from '#/modules/reports/components/owner/chart-kit'
import { DeltaText } from '#/modules/reports/components/owner/delta-text'
import {
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { compactMoney } from '#/modules/reports/lib/owner-series'

const config = {
  previous: { label: 'Anterior', color: chartColors.previous },
  current: { label: 'Actual', color: chartColors.sales },
} satisfies ChartConfig

const num = 'text-right tabular-nums'

const percentOf = (bps: number | null) =>
  bps === null ? '—' : `${(bps / 100).toFixed(1)} %`

/** Sales per warehouse against the previous period, plus margin and tickets. */
export function WarehouseComparison({
  rows,
  sentence,
}: {
  rows: Array<WarehouseRankingRow>
  sentence: string | null
}) {
  const data = rows.map((row) => ({
    name: row.name,
    previous: row.previous.revenueCents,
    current: row.current.revenueCents,
  }))
  return (
    <ReportCard
      title="Almacenes: actual contra anterior"
      sentence={sentence}
      description="Ventas por almacén; margen y tickets en la tabla."
    >
      <ChartLegendRow
        items={[
          { label: 'Anterior', color: chartColors.previous },
          { label: 'Actual', color: chartColors.sales },
        ]}
      />
      <ChartContainer
        config={config}
        className="aspect-auto h-[220px] w-full"
        role="img"
        aria-label="Ventas de cada almacén contra el periodo anterior"
      >
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            dataKey="previous"
            fill="var(--color-previous)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="current"
            fill="var(--color-current)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
      <TableWrap bordered className="mt-3.5">
        <DataTable>
          <thead>
            <tr>
              <Th>Almacén</Th>
              <Th className={num}>Ventas</Th>
              <Th className={num}>Margen</Th>
              <Th className={num}>Δ margen</Th>
              <Th className={num}>Tickets</Th>
              <Th className={num}>Ticket prom.</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.key}>
                <Td>{row.name}</Td>
                <Td className={num}>
                  {formatCents(row.current.revenueCents)}
                  <br />
                  <DeltaText
                    value={row.delta.revenueCents}
                    label={formatDeltaBps(row.delta.revenueChangeBps, '%')}
                  />
                </Td>
                <Td className={num}>{percentOf(row.current.marginBps)}</Td>
                <Td className={num}>
                  <DeltaText
                    value={row.delta.marginBps}
                    label={formatDeltaBps(row.delta.marginBps, 'pp')}
                  />
                </Td>
                <Td className={num}>{row.current.tickets}</Td>
                <Td className={num}>
                  {formatCents(row.current.averageTicketCents)}
                </Td>
              </Row>
            ))}
          </tbody>
        </DataTable>
      </TableWrap>
    </ReportCard>
  )
}
