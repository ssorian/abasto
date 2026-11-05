import { useState } from 'react'

import { PageHeading } from '#/components/page-heading'
import { AbonoDialog } from '#/modules/credit/components/abono-dialog'
import { AbonoHistory } from '#/modules/credit/components/abono-history'
import { AuthorizationsList } from '#/modules/credit/components/authorizations-list'
import { ChargesTable } from '#/modules/credit/components/charges-table'
import { CollectionsBanner } from '#/modules/credit/components/collections-banner'
import { StatementDialog } from '#/modules/credit/components/statement-dialog'
import { EmptyState } from '#/modules/counter/components/empty-state'
import { CompactSelect } from '#/modules/counter/components/form-controls'
import {
  collectionMetrics,
  collectionViews,
  filterCharges,
} from '#/modules/credit/lib/collections'
import type { CollectionView } from '#/modules/credit/lib/collections'
import { SectionHelp } from '#/modules/inventory/components/info-blocks'
import { formatCents } from '#/modules/pricing/lib/money'
import { MetricStrip } from '#/modules/reports/components/metric-strip'
import type { ReceivablesOverview } from '#/modules/credit/server/receivables'

type Panel = { kind: 'abono' | 'statement'; customerId: string } | undefined

const allCustomers = 'Todos'

const emptyMessage: Record<CollectionView, string> = {
  Pendientes: 'Ningún pedido a crédito tiene saldo pendiente.',
  Vencidos: 'No hay pedidos a crédito vencidos.',
  Pagados: 'Todavía no hay pedidos a crédito pagados.',
  Todos: 'Todavía no hay pedidos a crédito recogidos.',
}

export function ReceivablesPage({
  overview,
  onSelectWarehouse,
}: {
  overview: ReceivablesOverview
  onSelectWarehouse: (warehouseId: string) => void
}) {
  const [panel, setPanel] = useState<Panel>()
  const [customerFilter, setCustomerFilter] = useState(allCustomers)
  const [view, setView] = useState<CollectionView>('Pendientes')
  const selected = overview.warehouses.find(
    ({ id }) => id === overview.selectedId,
  )
  const customer = overview.customers.find(
    ({ customerId }) => customerId === panel?.customerId,
  )
  const customerId =
    customerFilter === allCustomers ? undefined : customerFilter
  const ofCustomer = <T extends { customerId: string }>(rows: Array<T>) =>
    rows.filter((row) => !customerId || row.customerId === customerId)
  const charges = ofCustomer(overview.charges)
  const abonos = ofCustomer(overview.abonos)
  const metrics = collectionMetrics(charges, abonos, overview.today)
  const rows = filterCharges(overview.charges, { view, customerId })
  // Anyone who ever bought on credit, so a paid-up customer stays selectable.
  const debtors = [
    ...new Map(
      overview.charges.map((row) => [row.customerId, row.customerName]),
    ),
  ].sort(([, a], [, b]) => a.localeCompare(b, 'es'))
  const statementName =
    customer?.name ??
    debtors.find(([id]) => id === panel?.customerId)?.[1] ??
    ''

  return (
    <>
      <PageHeading
        eyebrow="ABARROTEROS · ALMACÉN"
        title="Cobros"
        description="Dinero recibido, saldos pendientes y crédito vencido."
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
          <CollectionsBanner />
          <MetricStrip
            columns={4}
            items={[
              {
                label: 'Saldo por cobrar',
                value: formatCents(metrics.balanceCents),
              },
              {
                label: 'Crédito vencido',
                value: formatCents(metrics.overdueCents),
              },
              {
                label: 'Por vencer',
                value: formatCents(metrics.currentCents),
              },
              {
                label: 'Abonos de hoy',
                value: formatCents(metrics.receivedTodayCents),
              },
            ]}
          />
          <div className="my-5 flex flex-wrap items-center gap-3">
            <CompactSelect
              aria-label="Filtrar cobros por cliente"
              className="min-w-[160px] max-md:flex-1"
              value={customerFilter}
              onChange={(event) => setCustomerFilter(event.target.value)}
            >
              <option value={allCustomers}>Todos los clientes</option>
              {debtors.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </CompactSelect>
            <CompactSelect
              aria-label="Filtrar cartera"
              className="min-w-[160px] max-md:flex-1"
              value={view}
              onChange={(event) =>
                setView(event.target.value as CollectionView)
              }
            >
              {collectionViews.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </CompactSelect>
            <label className="flex items-center gap-2 text-[13px] text-[#32455e] max-md:basis-full md:ml-auto">
              Recibir abonos en
              <CompactSelect
                aria-label="Caja que recibe los abonos"
                className="min-w-[160px] max-md:flex-1"
                value={selected.id}
                onChange={(event) => onSelectWarehouse(event.target.value)}
              >
                {overview.warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </CompactSelect>
            </label>
          </div>
          {!overview.drawerOpen && (
            <p className="mb-4 text-sm text-[#a1372e]">
              La caja de {selected.name} está cerrada: ábrela en Mostrador para
              recibir abonos.
            </p>
          )}
          {rows.length === 0 ? (
            <EmptyState>{emptyMessage[view]}</EmptyState>
          ) : (
            <ChargesTable
              rows={rows}
              today={overview.today}
              onAbono={(id) => setPanel({ kind: 'abono', customerId: id })}
              onStatement={(id) =>
                setPanel({ kind: 'statement', customerId: id })
              }
            />
          )}
          <h3 className="mt-6 mb-[14px] text-[17px] font-[650]">
            Historial de abonos recibidos
          </h3>
          <AbonoHistory rows={abonos} />
          <SectionHelp>
            Solo se recibe efectivo. Un abono se registra al cliente y salda
            primero sus pedidos más antiguos, aunque lo inicies desde otro
            pedido. Las ventas de contado se cobran al entregar y aparecen en el
            corte de caja.
          </SectionHelp>
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
          {panel?.kind === 'statement' && panel.customerId && (
            <StatementDialog
              key={panel.customerId}
              customerId={panel.customerId}
              customerName={statementName}
              onClose={() => setPanel(undefined)}
            />
          )}
        </>
      )}
    </>
  )
}
