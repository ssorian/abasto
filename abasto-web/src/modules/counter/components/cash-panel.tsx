import { LockKeyhole, Plus, Wallet } from 'lucide-react'
import { useState } from 'react'

import { StatusBadge } from '#/components/status-badge'
import { warehouseNames } from '#/shared/demo/types'
import {
  activeCash,
  cashExpectedCents,
  netByMethod,
  openCash,
} from '#/modules/counter/lib/cash'
import { operatorName } from '#/modules/counter/lib/constants'
import { formatMoney, isValidMoney, toCents } from '#/modules/counter/lib/money'
import { ActionButton } from '#/modules/counter/components/action-button'
import {
  CashActionDialog,
  ShiftDetailDialog,
} from '#/modules/counter/components/cash-dialogs'
import {
  CellNote,
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'
import { EmptyState } from '#/modules/counter/components/empty-state'
import {
  CompactSelect,
  Field,
  FieldInput,
} from '#/modules/counter/components/form-controls'
import {
  InfoBanner,
  SectionHelp,
} from '#/modules/counter/components/info-banner'
import {
  DetailsBox,
  MetricGrid,
  StepPanel,
} from '#/modules/counter/components/metric-grid'
import { ShiftHistory } from '#/modules/counter/components/shift-history'

import type { CashAction } from '#/modules/counter/components/cash-dialogs'
import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type { WarehouseName } from '#/shared/demo/types'
import type { CounterState } from '#/modules/counter/types/counter'

/** "Caja y turnos": open a shift, move cash, count and close, and review history. */
export function CashPanel({
  state,
  apply,
}: {
  state: CounterState
  apply: ApplyOperation
}) {
  const [warehouse, setWarehouse] = useState<WarehouseName>('Centro')
  const [opening, setOpening] = useState('')
  const [action, setAction] = useState<CashAction | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const session = activeCash(state, warehouse)
  const detail = state.cashSessions.find((s) => s.id === detailId)
  const payments = session
    ? state.payments.filter((p) => p.cashSessionId === session.id)
    : []
  const movements = session
    ? state.cashMovements.filter((m) => m.sessionId === session.id)
    : []

  function openShift() {
    const done = apply((current) => {
      const amount = Number(opening)
      if (!isValidMoney(amount) || amount < 0) {
        throw new Error('Ingresa un fondo inicial válido.')
      }
      return openCash(
        current,
        warehouse,
        toCents(amount),
        new Date().toISOString(),
      )
    }, 'Turno de caja abierto.')
    if (done) setOpening('')
  }

  return (
    <>
      <InfoBanner
        icon={Wallet}
        title="Caja y cierre de turno"
        className="mb-[22px]"
      >
        Cada almacén tiene una caja activa. Los pagos anteriores sin turno no se
        suman a una apertura nueva.
      </InfoBanner>

      <div className="my-5 flex flex-wrap gap-3">
        <CompactSelect
          aria-label="Almacén de caja"
          value={warehouse}
          className="min-w-[120px] max-md:flex-1 md:min-w-40"
          onChange={(event) => {
            setWarehouse(event.target.value as WarehouseName)
            setAction(null)
          }}
        >
          {warehouseNames.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </CompactSelect>
        <StatusBadge tone={session ? 'green' : 'gray'}>
          {session ? 'Turno abierto' : 'Caja cerrada'}
        </StatusBadge>
      </div>

      {session ? (
        <>
          <DetailsBox>
            <b>
              {session.id} · {session.cashier}
            </b>
            <p>
              Abierta{' '}
              {new Date(session.openedAt).toLocaleString('es-MX', {
                timeZone: 'America/Mexico_City',
              })}{' '}
              · Fondo {formatMoney(session.openingCents)}
            </p>
          </DetailsBox>
          <MetricGrid
            items={[
              {
                label: 'Efectivo esperado',
                value: formatMoney(cashExpectedCents(state, session.id)),
              },
              {
                label: 'Cobros netos · efectivo',
                value: formatMoney(netByMethod(state, session.id, 'Efectivo')),
              },
              {
                label: 'Tarjeta · fuera del cajón',
                value: formatMoney(netByMethod(state, session.id, 'Tarjeta')),
              },
              {
                label: 'Transferencia · fuera del cajón',
                value: formatMoney(
                  netByMethod(state, session.id, 'Transferencia'),
                ),
              },
            ]}
          />
          <div className="my-[14px] flex flex-wrap gap-[9px]">
            <ActionButton onClick={() => setAction('Entrada')}>
              <Plus size={16} />
              Entrada de efectivo
            </ActionButton>
            <ActionButton onClick={() => setAction('Retiro')}>
              Retirar efectivo
            </ActionButton>
            <ActionButton tone="primary" onClick={() => setAction('Cierre')}>
              <LockKeyhole size={16} />
              Contar y cerrar turno
            </ActionButton>
          </div>
          <div className="rounded-xl border border-[#e3e9f0] bg-white">
            <TableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <Th>Movimiento del turno</Th>
                    <Th>Medio / motivo</Th>
                    <Th>Responsable</Th>
                    <Th>Importe</Th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <Td>
                        {payment.type}
                        <CellNote>{payment.orderId}</CellNote>
                      </Td>
                      <Td>
                        {payment.method}
                        <CellNote>{payment.reference}</CellNote>
                      </Td>
                      <Td>{payment.actor}</Td>
                      <Td>
                        {payment.type === 'Reembolso' ? '−' : ''}
                        {formatMoney(payment.amountCents)}
                      </Td>
                    </tr>
                  ))}
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <Td>{movement.type} de efectivo</Td>
                      <Td>{movement.reason}</Td>
                      <Td>{movement.actor}</Td>
                      <Td>
                        {movement.type === 'Retiro' ? '−' : ''}
                        {formatMoney(movement.amountCents)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </TableWrap>
            {!payments.length && !movements.length && (
              <EmptyState>El turno todavía no tiene movimientos.</EmptyState>
            )}
          </div>
        </>
      ) : (
        <StepPanel>
          <h3 className="text-base font-[650] text-[#244e7d]">
            Abrir caja · {warehouse}
          </h3>
          <SectionHelp>
            Responsable: {operatorName}. Captura el efectivo que realmente dejas
            para dar cambio.
          </SectionHelp>
          <Field label="Fondo inicial en efectivo (MXN)">
            <FieldInput
              type="number"
              min="0"
              step="0.01"
              value={opening}
              onChange={(event) => setOpening(event.target.value)}
              placeholder="0.00"
            />
          </Field>
          <ActionButton
            tone="primary"
            className="self-start"
            disabled={opening === ''}
            onClick={openShift}
          >
            Abrir turno
          </ActionButton>
        </StepPanel>
      )}

      <h3 className="mt-6 mb-[14px] text-[17px] font-[650]">
        Historial de turnos · {warehouse}
      </h3>
      <ShiftHistory
        sessions={state.cashSessions.filter((s) => s.warehouse === warehouse)}
        onOpen={setDetailId}
      />

      {action && session && (
        <CashActionDialog
          state={state}
          session={session}
          action={action}
          apply={apply}
          onClose={() => setAction(null)}
        />
      )}
      {detail && (
        <ShiftDetailDialog
          state={state}
          session={detail}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  )
}
