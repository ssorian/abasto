import { useState } from 'react'

import { formatCents } from '#/modules/pricing/lib/money'
import { MetricStrip } from '#/modules/reports/components/metric-strip'
import { PillTabs } from '#/modules/reports/components/pill-tabs'
import { ReportFootnote } from '#/modules/reports/components/report-footnote'
import {
  CellNote,
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { TableSection } from '#/modules/reports/components/table-section'
import { downloadText, salesCsv } from '#/modules/reports/lib/csv'
import { formatMargin } from '#/modules/reports/lib/margin'
import type {
  ProductSalesRow,
  SalesDimension,
  SalesReport,
  SalesRow,
} from '#/modules/reports/types/reports'

const dimensions: Array<{ value: SalesDimension; label: string }> = [
  { value: 'day', label: 'Por día' },
  { value: 'product', label: 'Por producto' },
  { value: 'customer', label: 'Por cliente' },
  { value: 'warehouse', label: 'Por almacén' },
]

const headings: Record<SalesDimension, string> = {
  day: 'Día',
  product: 'Producto',
  customer: 'Cliente',
  warehouse: 'Almacén',
}

const num = 'text-right'

function rowsOf(report: SalesReport, dimension: SalesDimension) {
  if (dimension === 'day') return report.byDay
  if (dimension === 'product') return report.byProduct
  if (dimension === 'customer') return report.byCustomer
  return report.byWarehouse
}

/** "Ventas y utilidad": revenue, cost and margin of the picked-up orders. */
export function SalesTab({ report }: { report: SalesReport }) {
  const [dimension, setDimension] = useState<SalesDimension>('day')
  const rows: Array<SalesRow | ProductSalesRow> = rowsOf(report, dimension)
  const { summary } = report

  return (
    <div>
      <MetricStrip
        items={[
          {
            label: 'Ventas',
            value: formatCents(summary.revenueCents),
            note: `${summary.orders} pedidos entregados · ${summary.units} unidades base`,
          },
          { label: 'Costo', value: formatCents(summary.costCents) },
          {
            label: 'Utilidad bruta',
            value: formatCents(summary.marginCents),
            note: `Margen ${formatMargin(summary.marginCents, summary.revenueCents)}`,
          },
        ]}
      />
      <PillTabs
        value={dimension}
        options={dimensions}
        onChange={setDimension}
      />
      <TableSection
        title={`Ventas ${dimensions.find((item) => item.value === dimension)?.label.toLowerCase()}`}
        description="Solo pedidos entregados en el periodo."
        count={rows.length}
        emptyText="No hay pedidos entregados en este periodo."
        onExport={() =>
          downloadText(
            salesCsv(dimension, rows),
            `abasto-ventas-${dimension}-${report.range.from}-${report.range.to}.csv`,
          )
        }
      >
        <TableWrap bordered>
          <DataTable>
            <thead>
              <tr>
                <Th>{headings[dimension]}</Th>
                <Th className={num}>Pedidos</Th>
                <Th className={num}>Unidades</Th>
                <Th className={num}>Ventas</Th>
                <Th className={num}>Costo</Th>
                <Th className={num}>Utilidad</Th>
                <Th className={num}>Margen</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Row key={row.key}>
                  <Td>
                    {row.name}
                    {'sku' in row && <CellNote>{row.sku}</CellNote>}
                  </Td>
                  <Td className={num}>{row.orders}</Td>
                  <Td className={num}>
                    {row.units}
                    {'unit' in row ? ` ${row.unit}` : ''}
                  </Td>
                  <Td className={num}>{formatCents(row.revenueCents)}</Td>
                  <Td className={num}>{formatCents(row.costCents)}</Td>
                  <Td className={num}>{formatCents(row.marginCents)}</Td>
                  <Td className={num}>
                    {formatMargin(row.marginCents, row.revenueCents)}
                  </Td>
                </Row>
              ))}
            </tbody>
            <tfoot>
              <Row className="font-semibold">
                <Td>Total del periodo</Td>
                <Td className={num}>{summary.orders}</Td>
                <Td className={num}>{summary.units}</Td>
                <Td className={num}>{formatCents(summary.revenueCents)}</Td>
                <Td className={num}>{formatCents(summary.costCents)}</Td>
                <Td className={num}>{formatCents(summary.marginCents)}</Td>
                <Td className={num}>
                  {formatMargin(summary.marginCents, summary.revenueCents)}
                </Td>
              </Row>
            </tfoot>
          </DataTable>
        </TableWrap>
      </TableSection>
      <ReportFootnote>
        Ventas son los totales congelados al reservar cada pedido; el costo es
        cada lote vendido a su propio costo por unidad, sin redondeos
        intermedios y redondeado al centavo una sola vez por fila, por lo que
        las filas pueden diferir un centavo del total. Los pedidos cancelados,
        vencidos o aún abiertos no son ventas. Utilidad bruta: no descuenta
        gastos.
      </ReportFootnote>
    </div>
  )
}
