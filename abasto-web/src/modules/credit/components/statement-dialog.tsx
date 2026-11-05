import { useEffect, useState } from 'react'

import { messageOf } from '#/modules/cash/hooks/use-action-runner'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import {
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'
import { EmptyState } from '#/modules/counter/components/empty-state'
import { useCreditActions } from '#/modules/credit/hooks/use-credit-actions'
import { statementRows } from '#/modules/credit/lib/statement'
import { formatOrderDate } from '#/modules/customers/lib/customer-labels'
import { formatCents } from '#/modules/pricing/lib/money'
import type { getCustomerStatement } from '#/modules/credit/services/customer-ledger'

type Statement = Awaited<ReturnType<typeof getCustomerStatement>>

/** Charges and abonos of one customer with the running balance, newest first. */
export function StatementDialog({
  customerId,
  customerName,
  onClose,
}: {
  customerId: string
  customerName: string
  onClose: () => void
}) {
  const actions = useCreditActions()
  const [statement, setStatement] = useState<Statement>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    actions
      .statement(customerId)
      .then(setStatement, (failure) => setError(messageOf(failure)))
    // Loaded once per customer.
  }, [customerId])

  return (
    <CounterDialog
      wide
      title={`Estado de cuenta · ${customerName}`}
      description={
        statement
          ? `Saldo ${formatCents(statement.balanceCents)} · vencido ${formatCents(statement.overdueCents)}`
          : 'Cargando…'
      }
      onClose={onClose}
    >
      {error && <p className="text-sm text-[#a1372e]">{error}</p>}
      {statement?.entries.length === 0 && (
        <EmptyState>Este cliente aún no tiene movimientos.</EmptyState>
      )}
      {statement && statement.entries.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Movimiento</Th>
                <Th>Monto</Th>
                <Th>Vencimiento</Th>
                <Th>Saldo</Th>
              </tr>
            </thead>
            <tbody>
              {statementRows(statement.entries, { newestFirst: true }).map(
                (row) => (
                  <tr key={row.id}>
                    <Td className="first:min-w-0">
                      {formatOrderDate(row.date)}
                    </Td>
                    <Td className="whitespace-normal">{row.label}</Td>
                    <Td>{row.amount}</Td>
                    <Td>{row.due}</Td>
                    <Td>{row.balance}</Td>
                  </tr>
                ),
              )}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
    </CounterDialog>
  )
}
