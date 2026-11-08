import { defaultNonMovingDays } from '#/modules/executive/lib/search'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import { NON_MOVING_DAYS } from '#/modules/executive/types/inventory'
import type { NonMovingCapital } from '#/modules/executive/types/inventory'
import { formatCents } from '#/modules/pricing/lib/money'
import { Field, FieldSelect } from '#/modules/reports/components/report-fields'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import { ReportFootnote } from '#/modules/reports/components/report-footnote'
import {
  CellNote,
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { SectionRow } from '#/modules/reports/components/section-row'

const num = 'text-right'

type NonMovingSectionProps = {
  nonMoving: NonMovingCapital
  onChange: (patch: Partial<ExecutiveSearch>) => void
}

/** Capital tied up in stock with no sale in the last 30, 60 or 90 days. */
export function NonMovingSection({
  nonMoving,
  onChange,
}: NonMovingSectionProps) {
  return (
    <section className="mt-[26px]">
      <SectionRow
        title="Capital detenido"
        description={`Total a costo: ${formatCents(nonMoving.totalCents)}`}
      >
        <Field label="Sin venta en los últimos">
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
        </Field>
      </SectionRow>
      {nonMoving.rows.length === 0 ? (
        <ReportEmpty>
          Todo el inventario tuvo ventas en los últimos {nonMoving.days} días.
        </ReportEmpty>
      ) : (
        <TableWrap bordered>
          <DataTable>
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th>Almacén</Th>
                <Th className={num}>Existencia</Th>
                <Th className={num}>Valor a costo</Th>
                <Th>Última venta</Th>
              </tr>
            </thead>
            <tbody>
              {nonMoving.rows.map((row) => (
                <Row key={`${row.warehouseId}-${row.productId}`}>
                  <Td>
                    {row.name}
                    <CellNote>{row.sku}</CellNote>
                  </Td>
                  <Td>{row.warehouseName}</Td>
                  <Td className={num}>
                    {row.onHand} {row.unit}
                  </Td>
                  <Td className={num}>{formatCents(row.valueCents)}</Td>
                  <Td>
                    {row.lastSaleOn === null
                      ? 'Sin venta en este almacén'
                      : `${row.lastSaleOn} · hace ${row.daysSinceLastSale} días`}
                  </Td>
                </Row>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
      <ReportFootnote>
        Cada producto se evalúa por almacén: puede venderse en uno y estar
        detenido en otro. Una venta es un pedido entregado.
      </ReportFootnote>
    </section>
  )
}
