import { useState } from 'react'

import { ActionButton } from '#/modules/counter/components/action-button'
import {
  CellNote,
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'
import { orderCode } from '#/modules/counter/lib/order-format'
import { useCreditActions } from '#/modules/credit/hooks/use-credit-actions'
import { formatOrderDate } from '#/modules/customers/lib/customer-labels'
import { formatCents } from '#/modules/pricing/lib/money'
import type { PendingRequest } from '#/modules/credit/server/receivables'

/** Owner only: orders waiting for a credit authorization. */
export function AuthorizationsList({
  requests,
}: {
  requests: ReadonlyArray<PendingRequest>
}) {
  const actions = useCreditActions()
  const [busyId, setBusyId] = useState<string>()

  async function decide(id: string, action: (id: string) => Promise<unknown>) {
    setBusyId(id)
    await action(id)
    setBusyId(undefined)
  }

  return (
    <section aria-label="Autorizaciones de crédito" className="mb-6">
      <h2 className="mb-3 text-[17px] font-[650]">Autorizaciones pendientes</h2>
      {requests.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No hay pedidos esperando tu autorización.
        </p>
      ) : (
        <TableWrap className="rounded-xl border border-[#e3e9f0] bg-white">
          <DataTable>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Pedido</Th>
                <Th>Monto</Th>
                <Th>Pedido el</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <Td>
                    {request.customerName}
                    <CellNote>{request.warehouseName}</CellNote>
                  </Td>
                  <Td>{orderCode(request.orderId)}</Td>
                  <Td>{formatCents(request.amountCents)}</Td>
                  <Td>{formatOrderDate(request.requestedAt)}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <ActionButton
                        tone="primary"
                        disabled={busyId === request.id}
                        onClick={() => decide(request.id, actions.approve)}
                      >
                        Autorizar
                      </ActionButton>
                      <ActionButton
                        disabled={busyId === request.id}
                        onClick={() => decide(request.id, actions.reject)}
                      >
                        Rechazar
                      </ActionButton>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
    </section>
  )
}
