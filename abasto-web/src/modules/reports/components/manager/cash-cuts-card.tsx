import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import { formatCents } from '#/modules/pricing/lib/money'
import { cashDifferenceSeries } from '#/modules/reports/lib/manager-chart-data'
import { cashSupplierNote } from '#/modules/reports/lib/report-filters'
import { shortDate } from '#/modules/reports/lib/manager-format'
import { businessDate } from '#/modules/orders/services/clock'
import {
  CardEmpty,
  Chip,
  ManagerCard,
} from '#/modules/reports/components/manager/manager-card'
import {
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import type { CashCutRow } from '#/modules/reports/types/reports'

const config = {
  differenceCents: { label: 'Diferencia', color: '#a77a24' },
} satisfies ChartConfig

function Status({ row }: { row: CashCutRow }) {
  if (row.differenceCents === null) return <Chip tone="blue">Abierta</Chip>
  if (row.differenceCents === 0) return <Chip tone="green">Cuadra</Chip>
  return row.differenceCents < 0 ? (
    <Chip tone="amber">Faltante</Chip>
  ) : (
    <Chip tone="amber">Sobrante</Chip>
  )
}

const signed = (cents: number) =>
  cents > 0 ? `+${formatCents(cents)}` : formatCents(cents)

/** Cash cuts of the period: the difference of each closed cut and the cut table. */
export function CashCutsCard({
  rows,
  warehouse,
  supplierFiltered = false,
}: {
  rows: Array<CashCutRow>
  warehouse: string
  /** A supplier is selected: say that cash does not follow it. */
  supplierFiltered?: boolean
}) {
  const series = cashDifferenceSeries(rows)
  const newestFirst = [...rows].reverse()
  return (
    <ManagerCard
      title="Cortes de caja"
      subtitle={`Cortes de ${warehouse} del periodo y su diferencia entre lo contado y lo esperado.${supplierFiltered ? ` ${cashSupplierNote}` : ''}`}
    >
      {rows.length === 0 ? (
        <CardEmpty>No hubo turnos de caja en este periodo.</CardEmpty>
      ) : (
        <div className="grid gap-4">
          {series.length > 0 && (
            <ChartContainer
              config={config}
              role="img"
              aria-label={`Diferencia de caja de ${series.length} cortes cerrados.`}
              className="aspect-auto h-[170px] w-full"
            >
              <BarChart data={series} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#f0e9e1" />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={14}
                />
                <YAxis
                  tickFormatter={(cents: number) =>
                    `$${Math.round(cents / 100)}`
                  }
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <ReferenceLine y={0} stroke="#74686a" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, items) =>
                        shortDate(String(items[0]?.payload.date))
                      }
                      formatter={(value) => (
                        <span className="flex w-full justify-between gap-4">
                          <span>Diferencia</span>
                          <span className="font-medium tabular-nums">
                            {signed(Number(value))}
                          </span>
                        </span>
                      )}
                    />
                  }
                />
                <Bar dataKey="differenceCents" radius={3} maxBarSize={36}>
                  {series.map((point) => (
                    <Cell
                      key={point.date}
                      fill={point.differenceCents === 0 ? '#39816e' : '#a77a24'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
          <TableWrap bordered>
            <DataTable>
              <thead>
                <tr>
                  <Th>Día</Th>
                  <Th>Cerró</Th>
                  <Th className="text-right">Esperado</Th>
                  <Th className="text-right">Contado</Th>
                  <Th className="text-right">Diferencia</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {newestFirst.map((row) => (
                  <Row key={row.sessionId}>
                    <Td className="first:min-w-0">
                      {shortDate(businessDate(new Date(row.openedAt)))}
                    </Td>
                    <Td>{row.closedByName ?? '—'}</Td>
                    <Td className="text-right tabular-nums">
                      {formatCents(row.expectedCents)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {row.countedCents === null
                        ? '—'
                        : formatCents(row.countedCents)}
                    </Td>
                    <Td className="text-right font-semibold tabular-nums">
                      {row.differenceCents === null
                        ? '—'
                        : signed(row.differenceCents)}
                    </Td>
                    <Td>
                      <Status row={row} />
                    </Td>
                  </Row>
                ))}
              </tbody>
            </DataTable>
          </TableWrap>
        </div>
      )}
    </ManagerCard>
  )
}
