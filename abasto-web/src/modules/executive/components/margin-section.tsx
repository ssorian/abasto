import { useState } from 'react'

import { formatBpsPercent } from '#/modules/executive/lib/format'
import type {
  MarginReport,
  MarginRow,
  MarginTotals,
} from '#/modules/executive/types/profitability'
import { formatCents } from '#/modules/pricing/lib/money'
import { PillTabs } from '#/modules/reports/components/pill-tabs'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import {
  CellNote,
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { SectionRow } from '#/modules/reports/components/section-row'

type Dimension = 'warehouse' | 'supplier' | 'product'

const dimensions: Array<{ value: Dimension; label: string }> = [
  { value: 'warehouse', label: 'Por almacén' },
  { value: 'supplier', label: 'Por proveedor' },
  { value: 'product', label: 'Por producto' },
]

const headings: Record<Dimension, string> = {
  warehouse: 'Almacén',
  supplier: 'Proveedor',
  product: 'Producto',
}

const num = 'text-right'

function rowsOf(report: MarginReport, dimension: Dimension) {
  if (dimension === 'warehouse') return report.byWarehouse
  if (dimension === 'supplier') return report.bySupplier
  return report.byProduct
}

function Figures({ row }: { row: MarginTotals }) {
  return (
    <>
      <Td className={num}>{row.units}</Td>
      <Td className={num}>{formatCents(row.revenueCents)}</Td>
      <Td className={num}>{formatCents(row.costCents)}</Td>
      <Td className={num}>{formatCents(row.marginCents)}</Td>
      <Td className={num}>{formatBpsPercent(row.marginBps)}</Td>
    </>
  )
}

/** Gross margin broken down by warehouse, supplier or product. */
export function MarginSection({ report }: { report: MarginReport }) {
  const [dimension, setDimension] = useState<Dimension>('warehouse')
  const rows: Array<MarginRow & { sku?: string; unit?: string }> = rowsOf(
    report,
    dimension,
  )
  return (
    <section className="mt-[26px]">
      <SectionRow
        title="Rentabilidad"
        description="Utilidad bruta de los pedidos entregados en el periodo."
      />
      <PillTabs
        value={dimension}
        options={dimensions}
        onChange={setDimension}
      />
      {rows.length === 0 ? (
        <ReportEmpty>No hay pedidos entregados en este periodo.</ReportEmpty>
      ) : (
        <TableWrap bordered>
          <DataTable>
            <thead>
              <tr>
                <Th>{headings[dimension]}</Th>
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
                    {row.sku && <CellNote>{row.sku}</CellNote>}
                  </Td>
                  <Figures row={row} />
                </Row>
              ))}
            </tbody>
            <tfoot>
              <Row className="font-semibold">
                <Td>Total del periodo</Td>
                <Figures row={report.summary} />
              </Row>
            </tfoot>
          </DataTable>
        </TableWrap>
      )}
    </section>
  )
}
