import { StatusBadge } from '#/components/status-badge'
import {
  CellNote,
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'
import { EmptyState } from '#/modules/counter/components/empty-state'
import type { AbonoRow } from '#/modules/credit/lib/collections'
import { formatOrderDate } from '#/modules/customers/lib/customer-labels'
import { formatCents } from '#/modules/pricing/lib/money'

/** Cash received from customers, newest first. */
export function AbonoHistory({ rows }: { rows: Array<AbonoRow> }) {
  if (rows.length === 0) {
    return <EmptyState>Todavía no hay abonos registrados.</EmptyState>
  }
  return (
    <TableWrap className="rounded-xl border border-[#f0eae3] bg-white">
      <DataTable>
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Movimiento</Th>
            <Th>Cliente</Th>
            <Th>Medio / caja</Th>
            <Th>Importe</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <Td>{formatOrderDate(row.createdAt)}</Td>
              <Td>
                <StatusBadge tone="green">Abono</StatusBadge>
              </Td>
              <Td className="whitespace-normal">{row.customerName}</Td>
              <Td>
                Efectivo
                <CellNote>Caja de {row.warehouseName}</CellNote>
              </Td>
              <Td>{formatCents(row.amountCents)}</Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </TableWrap>
  )
}
