import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip } from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  MoneyTooltip,
  ReportCard,
  chartColors,
} from '#/modules/reports/components/owner/chart-kit'
import {
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { cashSupplierNote } from '#/modules/reports/lib/report-filters'
import {
  closedCashCuts,
  compactMoney,
  shortDay,
} from '#/modules/reports/lib/owner-series'
import type { CashCutRow } from '#/modules/reports/types/reports'

const config = {
  differenceCents: { label: 'Diferencia', color: chartColors.shortage },
} satisfies ChartConfig

const chartCuts = 14
const tableCuts = 8

const status = (difference: number) =>
  difference === 0
    ? { label: 'Cuadra', chip: 'bg-[#e9f4ef]', dot: 'bg-[#39816e]' }
    : difference < 0
      ? { label: 'Faltante', chip: 'bg-[#fbeae7]', dot: 'bg-[#bd5754]' }
      : { label: 'Sobrante', chip: 'bg-[#e9f4ef]', dot: 'bg-[#39816e]' }

/** Difference of each closed cash cut: surplus in green, shortage in red. */
export function CashSection({
  rows,
  sentence,
  supplierFiltered = false,
}: {
  rows: Array<CashCutRow>
  sentence: string
  /** A supplier is selected: say that cash does not follow it. */
  supplierFiltered?: boolean
}) {
  const closed = closedCashCuts(rows)
  const data = closed.slice(-chartCuts).map((row) => ({
    id: row.sessionId,
    name: `${shortDay(row.day)} · ${row.warehouseName}`,
    differenceCents: row.differenceCents,
  }))
  const latest = closed.slice(-tableCuts).reverse()
  return (
    <ReportCard
      title="Cortes de caja"
      sentence={sentence}
      description={`Diferencia por corte (contado menos esperado). Sobrante en verde, faltante en rojo.${supplierFiltered ? ` ${cashSupplierNote}` : ''}`}
    >
      {data.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No hay cortes cerrados en este periodo.
        </p>
      ) : (
        <>
          <ChartContainer
            config={config}
            className="aspect-auto h-[200px] w-full"
            role="img"
            aria-label="Diferencia de cada corte de caja cerrado"
          >
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#f0e9e1" />
              <XAxis dataKey="name" tick={false} axisLine={false} />
              <YAxis
                tickFormatter={compactMoney}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <ChartTooltip content={<MoneyTooltip />} />
              <Bar dataKey="differenceCents" isAnimationActive={false}>
                {data.map((point) => (
                  <Cell
                    key={point.id}
                    fill={
                      point.differenceCents < 0
                        ? chartColors.shortage
                        : chartColors.surplus
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <TableWrap bordered className="mt-3">
            <DataTable>
              <thead>
                <tr>
                  <Th>Día</Th>
                  <Th>Almacén</Th>
                  <Th>Cerró</Th>
                  <Th className="text-right">Esperado</Th>
                  <Th className="text-right">Contado</Th>
                  <Th className="text-right">Diferencia</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {latest.map((row) => {
                  const state = status(row.differenceCents)
                  return (
                    <Row key={row.sessionId}>
                      <Td>{shortDay(row.day)}</Td>
                      <Td>{row.warehouseName}</Td>
                      <Td>{row.closedByName ?? '—'}</Td>
                      <Td className="text-right tabular-nums">
                        {formatCents(row.expectedCents)}
                      </Td>
                      <Td className="text-right tabular-nums">
                        {formatCents(row.countedCents ?? 0)}
                      </Td>
                      <Td className="text-right font-semibold tabular-nums">
                        {formatCents(row.differenceCents)}
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-[650] ${state.chip}`}
                        >
                          <i className={`size-2 rounded-full ${state.dot}`} />
                          {state.label}
                        </span>
                      </Td>
                    </Row>
                  )
                })}
              </tbody>
            </DataTable>
          </TableWrap>
        </>
      )}
    </ReportCard>
  )
}
