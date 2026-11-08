import type { InventoryValue } from '#/modules/executive/types/inventory'
import { formatCents } from '#/modules/pricing/lib/money'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import {
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { SectionRow } from '#/modules/reports/components/section-row'

const num = 'text-right'

/** Stock valued at what it cost, per warehouse, with the grand total. */
export function InventorySection({ inventory }: { inventory: InventoryValue }) {
  return (
    <section className="mt-[26px]">
      <SectionRow
        title="Inventario a costo"
        description="Existencias actuales valuadas al costo de cada lote."
      />
      {inventory.warehouses.length === 0 ? (
        <ReportEmpty>No hay almacenes activos.</ReportEmpty>
      ) : (
        <TableWrap bordered>
          <DataTable>
            <thead>
              <tr>
                <Th>Almacén</Th>
                <Th className={num}>Unidades</Th>
                <Th className={num}>Valor a costo</Th>
              </tr>
            </thead>
            <tbody>
              {inventory.warehouses.map((item) => (
                <Row key={item.id}>
                  <Td>{item.name}</Td>
                  <Td className={num}>{item.units}</Td>
                  <Td className={num}>{formatCents(item.valueCents)}</Td>
                </Row>
              ))}
            </tbody>
            <tfoot>
              <Row className="font-semibold">
                <Td>Total</Td>
                <Td className={num}>
                  {inventory.warehouses.reduce(
                    (sum, item) => sum + item.units,
                    0,
                  )}
                </Td>
                <Td className={num}>{formatCents(inventory.totalCents)}</Td>
              </Row>
            </tfoot>
          </DataTable>
        </TableWrap>
      )}
    </section>
  )
}
