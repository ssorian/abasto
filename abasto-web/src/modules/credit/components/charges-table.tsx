import { StatusBadge } from '#/components/status-badge'
import { ActionButton } from '#/modules/counter/components/action-button'
import {
  CellNote,
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'
import { orderCode } from '#/modules/counter/lib/order-format'
import { daysOverdue } from '#/modules/credit/lib/collections'
import type { ChargeRow } from '#/modules/credit/lib/collections'
import { dueLabel } from '#/modules/credit/lib/statement'
import { formatCents } from '#/modules/pricing/lib/money'

type ChargesTableProps = {
  rows: Array<ChargeRow>
  today: string
  onAbono: (customerId: string) => void
  onStatement: (customerId: string) => void
}

function DueCell({ row, today }: { row: ChargeRow; today: string }) {
  if (!row.dueOn) return <CellNote>Sin fecha</CellNote>
  if (row.overdue) {
    const days = daysOverdue(row.dueOn, today)
    return (
      <CellNote className="font-semibold text-[#a1372e]">
        Venció {dueLabel(row.dueOn)} · hace {days} {days === 1 ? 'día' : 'días'}
      </CellNote>
    )
  }
  return <CellNote>Vence {dueLabel(row.dueOn)}</CellNote>
}

function BalanceCell({ row }: { row: ChargeRow }) {
  if (row.balanceCents === 0) {
    return <StatusBadge tone="green">Pagado</StatusBadge>
  }
  return (
    <>
      <strong className={row.overdue ? 'text-[#a1372e]' : undefined}>
        {formatCents(row.balanceCents)}
      </strong>
      <CellNote>{row.overdue ? 'Vencido' : 'Al corriente'}</CellNote>
    </>
  )
}

/** Credit orders picked up, with what each one still owes. */
export function ChargesTable({
  rows,
  today,
  onAbono,
  onStatement,
}: ChargesTableProps) {
  return (
    <TableWrap className="rounded-xl border border-[#f0eae3] bg-white">
      <DataTable>
        <thead>
          <tr>
            <Th>Pedido / cliente</Th>
            <Th>Condición / vencimiento</Th>
            <Th>Venta</Th>
            <Th>Abonado</Th>
            <Th>Saldo del pedido</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <Td>
                <strong>{row.customerName}</strong>
                <CellNote>
                  {row.orderId ? orderCode(row.orderId) : 'Cargo'} · Recogido en{' '}
                  {row.warehouseName}
                </CellNote>
              </Td>
              <Td>
                Crédito
                <DueCell row={row} today={today} />
              </Td>
              <Td>{formatCents(row.amountCents)}</Td>
              <Td>{formatCents(row.paidCents)}</Td>
              <Td>
                <BalanceCell row={row} />
              </Td>
              <Td>
                <div className="flex justify-end gap-2">
                  <ActionButton
                    tone="primary"
                    disabled={row.balanceCents === 0}
                    onClick={() => onAbono(row.customerId)}
                  >
                    Registrar abono
                  </ActionButton>
                  <ActionButton onClick={() => onStatement(row.customerId)}>
                    Estado de cuenta
                  </ActionButton>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </TableWrap>
  )
}
