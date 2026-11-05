import { useEffect, useState } from 'react'

import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import {
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'
import { EmptyState } from '#/modules/counter/components/empty-state'
import { useCashActions } from '#/modules/cash/hooks/use-cash-actions'
import { messageOf } from '#/modules/cash/hooks/use-action-runner'
import {
  differenceLabel,
  summarizeSession,
} from '#/modules/cash/lib/cash-summary'
import { formatOrderDate } from '#/modules/customers/lib/customer-labels'
import { formatCents } from '#/modules/pricing/lib/money'
import type { CashSessionDetail } from '#/modules/cash/services/cash-sessions'

/** Every session of the warehouse, newest first. Only owner and manager open it. */
export function CashHistoryDialog({
  warehouseId,
  onClose,
}: {
  warehouseId: string
  onClose: () => void
}) {
  const actions = useCashActions(warehouseId)
  const [sessions, setSessions] = useState<Array<CashSessionDetail>>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    actions
      .history()
      .then(setSessions, (failure) => setError(messageOf(failure)))
    // Loaded once per warehouse.
  }, [warehouseId])

  return (
    <CounterDialog
      wide
      title="Historial de caja"
      description="Turnos de caja de este almacén, del más reciente al más antiguo."
      onClose={onClose}
    >
      {error && <p className="text-sm text-[#a1372e]">{error}</p>}
      {!sessions && !error && <p className="text-sm">Cargando…</p>}
      {sessions?.length === 0 && (
        <EmptyState>Aún no se ha abierto ninguna caja.</EmptyState>
      )}
      {sessions && sessions.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <Th>Apertura</Th>
                <Th>Cierre</Th>
                <Th>Ventas</Th>
                <Th>Abonos</Th>
                <Th>Esperado</Th>
                <Th>Contado</Th>
                <Th>Diferencia</Th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(({ session, movements, expectedCents }) => {
                const summary = summarizeSession(
                  session.openingCents,
                  movements,
                )
                return (
                  <tr key={session.id}>
                    <Td>{formatOrderDate(session.openedAt)}</Td>
                    <Td>
                      {session.closedAt
                        ? formatOrderDate(session.closedAt)
                        : 'Abierta'}
                    </Td>
                    <Td>{formatCents(summary.salesCents)}</Td>
                    <Td>{formatCents(summary.abonosCents)}</Td>
                    <Td>{formatCents(expectedCents)}</Td>
                    <Td>
                      {session.countedCents === null
                        ? '—'
                        : formatCents(session.countedCents)}
                    </Td>
                    <Td>
                      {session.differenceCents === null
                        ? '—'
                        : differenceLabel(session.differenceCents)}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
    </CounterDialog>
  )
}
