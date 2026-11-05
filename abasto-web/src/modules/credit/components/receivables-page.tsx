import { useState } from 'react'

import { PageHeading } from '#/components/page-heading'
import { AbonoDialog } from '#/modules/credit/components/abono-dialog'
import { AuthorizationsList } from '#/modules/credit/components/authorizations-list'
import { StatementDialog } from '#/modules/credit/components/statement-dialog'
import { ActionButton } from '#/modules/counter/components/action-button'
import {
  CellNote,
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'
import { EmptyState } from '#/modules/counter/components/empty-state'
import { FieldSelect } from '#/modules/counter/components/form-controls'
import { formatCents } from '#/modules/pricing/lib/money'
import type { ReceivablesOverview } from '#/modules/credit/server/receivables'

type Panel = { kind: 'abono' | 'statement'; customerId: string } | undefined

export function ReceivablesPage({
  overview,
  onSelectWarehouse,
}: {
  overview: ReceivablesOverview
  onSelectWarehouse: (warehouseId: string) => void
}) {
  const [panel, setPanel] = useState<Panel>()
  const selected = overview.warehouses.find(
    ({ id }) => id === overview.selectedId,
  )
  const customer = overview.customers.find(
    ({ customerId }) => customerId === panel?.customerId,
  )

  return (
    <>
      <PageHeading
        eyebrow="ABARROTEROS · ALMACÉN"
        title="Cobros"
        description="Saldos de tus clientes, abonos y autorizaciones de crédito."
      />
      {overview.canAuthorize && (
        <AuthorizationsList requests={overview.pending} />
      )}
      {!selected ? (
        <p className="text-sm text-ink-muted">
          Aún no tienes almacenes asignados.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <label className="flex min-w-[220px] flex-col gap-[7px] text-[13px] font-medium text-[#32455e]">
              Recibir abonos en
              <FieldSelect
                value={selected.id}
                onChange={(event) => onSelectWarehouse(event.target.value)}
              >
                {overview.warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </FieldSelect>
            </label>
            <p className="text-sm text-ink-muted">
              {overview.drawerOpen
                ? 'La caja está abierta.'
                : 'La caja está cerrada: ábrela en Mostrador para recibir abonos.'}
            </p>
          </div>
          {overview.customers.length === 0 ? (
            <EmptyState>Ningún cliente tiene saldo pendiente.</EmptyState>
          ) : (
            <TableWrap className="rounded-xl border border-[#e3e9f0] bg-white">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Cliente</Th>
                    <Th>Saldo</Th>
                    <Th>Vencido</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {overview.customers.map((row) => (
                    <tr key={row.customerId}>
                      <Td>
                        {row.name}
                        <CellNote>
                          Límite {formatCents(row.creditLimitCents)} ·{' '}
                          {row.termsDays} días
                        </CellNote>
                      </Td>
                      <Td>{formatCents(row.balanceCents)}</Td>
                      <Td
                        className={
                          row.overdueCents > 0
                            ? 'font-[650] text-[#a1372e]'
                            : undefined
                        }
                      >
                        {row.overdueCents > 0
                          ? formatCents(row.overdueCents)
                          : '—'}
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          <ActionButton
                            tone="primary"
                            onClick={() =>
                              setPanel({
                                kind: 'abono',
                                customerId: row.customerId,
                              })
                            }
                          >
                            Registrar abono
                          </ActionButton>
                          <ActionButton
                            onClick={() =>
                              setPanel({
                                kind: 'statement',
                                customerId: row.customerId,
                              })
                            }
                          >
                            Estado de cuenta
                          </ActionButton>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </TableWrap>
          )}
          {panel?.kind === 'abono' && customer && (
            <AbonoDialog
              key={customer.customerId}
              warehouseId={selected.id}
              warehouseName={selected.name}
              customerId={customer.customerId}
              customerName={customer.name}
              balanceCents={customer.balanceCents}
              drawerOpen={overview.drawerOpen}
              onClose={() => setPanel(undefined)}
            />
          )}
          {panel?.kind === 'statement' && customer && (
            <StatementDialog
              key={customer.customerId}
              customerId={customer.customerId}
              customerName={customer.name}
              onClose={() => setPanel(undefined)}
            />
          )}
        </>
      )}
    </>
  )
}
