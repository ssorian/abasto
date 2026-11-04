import { useState } from 'react'

import {
  cashExpectedCents,
  closeCash,
  moveCash,
} from '#/modules/counter/lib/cash'
import { formatMoney, isValidMoney, toCents } from '#/modules/counter/lib/money'
import { ActionButton } from '#/modules/counter/components/action-button'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import {
  Field,
  FieldInput,
  FieldTextarea,
} from '#/modules/counter/components/form-controls'
import { SectionHelp } from '#/modules/counter/components/info-banner'
import { InfoPairs, MetricGrid } from '#/modules/counter/components/metric-grid'

import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type { CashSession, CounterState } from '#/modules/counter/types/counter'

export type CashAction = 'Entrada' | 'Retiro' | 'Cierre'

type CashActionDialogProps = {
  state: CounterState
  session: CashSession
  action: CashAction
  apply: ApplyOperation
  onClose: () => void
}

function parseAmount(value: string, message: string) {
  const amount = Number(value)
  if (!isValidMoney(amount)) throw new Error(message)
  return toCents(amount)
}

/** Cash in/out or shift count dialog. */
export function CashActionDialog({
  state,
  session,
  action,
  apply,
  onClose,
}: CashActionDialogProps) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const isClosing = action === 'Cierre'
  const expected = cashExpectedCents(state, session.id)

  function submit() {
    const done = apply(
      (current) => {
        const date = new Date().toISOString()
        return isClosing
          ? closeCash(
              current,
              session.id,
              parseAmount(amount, 'Captura el efectivo contado.'),
              reason,
              date,
            )
          : moveCash(
              current,
              session.id,
              action,
              parseAmount(amount, 'Indica importe y motivo del movimiento.'),
              reason,
              date,
            )
      },
      isClosing
        ? 'Turno cerrado y arqueo registrado.'
        : 'Movimiento de efectivo registrado.',
    )
    if (done) onClose()
  }

  return (
    <CounterDialog
      title={isClosing ? 'Arqueo y cierre de turno' : `${action} de efectivo`}
      description={`${session.id} · ${session.cashier} · Almacén ${session.warehouse}`}
      onClose={onClose}
    >
      {isClosing && (
        <SectionHelp>
          Cuenta el dinero físicamente. Tarjetas y transferencias no forman
          parte del efectivo contado.
        </SectionHelp>
      )}
      <Field label={isClosing ? 'Efectivo contado (MXN)' : 'Importe (MXN)'}>
        <FieldInput
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
        />
      </Field>
      {isClosing && amount !== '' && (
        <MetricGrid
          items={[
            { label: 'Esperado', value: formatMoney(expected) },
            {
              label: 'Diferencia',
              value: formatMoney(toCents(Number(amount)) - expected),
            },
          ]}
        />
      )}
      <Field
        label={
          isClosing
            ? 'Nota · obligatoria si hay diferencia'
            : 'Motivo obligatorio'
        }
      >
        <FieldTextarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
        />
      </Field>
      <SectionHelp>
        Los retiros y cierres con diferencias quedan sujetos a autorización. Un
        turno cerrado conserva su resultado.
      </SectionHelp>
      <ActionButton
        tone="primary"
        className="self-start"
        disabled={amount === ''}
        onClick={submit}
      >
        {isClosing ? 'Confirmar cierre' : 'Registrar movimiento'}
      </ActionButton>
    </CounterDialog>
  )
}

/** Read-only summary of one shift. */
export function ShiftDetailDialog({
  state,
  session,
  onClose,
}: {
  state: CounterState
  session: CashSession
  onClose: () => void
}) {
  const pending = (cents: number | undefined) =>
    cents === undefined ? 'Pendiente' : formatMoney(cents)

  return (
    <CounterDialog
      title={session.id}
      description={`${session.warehouse} · ${session.cashier}`}
      onClose={onClose}
    >
      <InfoPairs
        rows={[
          ['Estado', session.status],
          ['Apertura', new Date(session.openedAt).toLocaleString('es-MX')],
          ['Fondo', formatMoney(session.openingCents)],
          [
            'Efectivo esperado',
            formatMoney(
              session.expectedCents ?? cashExpectedCents(state, session.id),
            ),
          ],
          ['Contado', pending(session.countedCents)],
          ['Diferencia', pending(session.differenceCents)],
          ['Cerró', session.closedBy ?? '—'],
        ]}
      />
      <p>{session.note || 'Sin observaciones'}</p>
    </CounterDialog>
  )
}
