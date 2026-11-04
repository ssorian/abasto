import { StatusBadge } from '#/components/status-badge'
import { formatMoney } from '#/modules/counter/lib/money'
import { TextLink } from '#/modules/counter/components/action-button'
import {
  CellNote,
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'

import type { CashSession } from '#/modules/counter/types/counter'

const dash = '—'

/** Past and current shifts of the selected warehouse. */
export function ShiftHistory({
  sessions,
  onOpen,
}: {
  sessions: Array<CashSession>
  onOpen: (sessionId: string) => void
}) {
  return (
    <div className="rounded-xl border border-[#e3e9f0] bg-white">
      <TableWrap>
        <DataTable>
          <thead>
            <tr>
              <Th>Turno / responsable</Th>
              <Th>Estado</Th>
              <Th>Fondo</Th>
              <Th>Esperado al cierre</Th>
              <Th>Contado</Th>
              <Th>Diferencia</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <Td>
                  {session.cashier}
                  <CellNote>{session.id}</CellNote>
                </Td>
                <Td>
                  <StatusBadge
                    tone={session.status === 'Abierta' ? 'green' : 'gray'}
                  >
                    {session.status}
                  </StatusBadge>
                </Td>
                <Td>{formatMoney(session.openingCents)}</Td>
                <Td>
                  {session.expectedCents === undefined
                    ? dash
                    : formatMoney(session.expectedCents)}
                </Td>
                <Td>
                  {session.countedCents === undefined
                    ? dash
                    : formatMoney(session.countedCents)}
                </Td>
                <Td className={session.differenceCents ? 'text-[#c35850]' : ''}>
                  {session.differenceCents === undefined
                    ? dash
                    : formatMoney(session.differenceCents)}
                </Td>
                <Td>
                  <TextLink onClick={() => onOpen(session.id)}>Ver</TextLink>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </TableWrap>
    </div>
  )
}
