import { useState } from 'react'
import { toast } from 'sonner'

import { ActionButton } from '#/modules/counter/components/action-button'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import { Field, FieldInput } from '#/modules/counter/components/form-controls'
import { useCashActions } from '#/modules/cash/hooks/use-cash-actions'
import { parsePesosToCents } from '#/modules/inventory/lib/cents'

type CashMovementDialogProps = {
  kind: 'entry' | 'withdrawal'
  warehouseId: string
  onClose: () => void
}

const copy = {
  entry: {
    title: 'Entrada de efectivo',
    description: 'Dinero que pones en la caja, por ejemplo cambio del banco.',
    reason: 'Ej. Cambio del banco',
  },
  withdrawal: {
    title: 'Retiro de efectivo',
    description:
      'Dinero que sacas de la caja. No puede ser más que el efectivo que hay.',
    reason: 'Ej. Pago a proveedor',
  },
}

export function CashMovementDialog({
  kind,
  warehouseId,
  onClose,
}: CashMovementDialogProps) {
  const actions = useCashActions(warehouseId)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const { title, description, reason: placeholder } = copy[kind]

  async function submit() {
    const cents = parsePesosToCents(amount)
    if (!cents.ok) return void toast.error(cents.message)
    if (!reason.trim())
      return void toast.error('Escribe el motivo del movimiento.')
    setBusy(true)
    const result = await actions[kind](cents.value, reason)
    setBusy(false)
    if (result) onClose()
  }

  return (
    <CounterDialog title={title} description={description} onClose={onClose}>
      <Field label="Monto (pesos)">
        <FieldInput
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      <Field label="Motivo">
        <FieldInput
          placeholder={placeholder}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-3">
        <ActionButton onClick={onClose}>Cancelar</ActionButton>
        <ActionButton tone="primary" disabled={busy} onClick={submit}>
          {kind === 'entry' ? 'Registrar entrada' : 'Registrar retiro'}
        </ActionButton>
      </div>
    </CounterDialog>
  )
}
