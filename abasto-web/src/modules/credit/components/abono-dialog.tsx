import { useState } from 'react'
import { toast } from 'sonner'

import { ActionButton } from '#/modules/counter/components/action-button'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import { Field, FieldInput } from '#/modules/counter/components/form-controls'
import { useCreditActions } from '#/modules/credit/hooks/use-credit-actions'
import { centsToPesosText } from '#/modules/credit/lib/statement'
import { parsePesosToCents } from '#/modules/inventory/lib/cents'
import { formatCents } from '#/modules/pricing/lib/money'

type AbonoDialogProps = {
  warehouseId: string
  warehouseName: string
  customerId: string
  customerName: string
  balanceCents: number
  drawerOpen: boolean
  onClose: () => void
}

/** Cash received from a customer into the selected warehouse's open drawer. */
export function AbonoDialog({
  warehouseId,
  warehouseName,
  customerId,
  customerName,
  balanceCents,
  drawerOpen,
  onClose,
}: AbonoDialogProps) {
  const actions = useCreditActions()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    const amount = parsePesosToCents(text)
    if (!amount.ok) return void toast.error(amount.message)
    setBusy(true)
    const result = await actions.abono(warehouseId, customerId, amount.value)
    setBusy(false)
    if (result) onClose()
  }

  return (
    <CounterDialog
      title={`Abono · ${customerName}`}
      description={`Saldo actual ${formatCents(balanceCents)}. El efectivo entra a la caja de ${warehouseName}.`}
      onClose={onClose}
    >
      {!drawerOpen && (
        <p className="text-sm text-[#a1372e]">
          Abre la caja de {warehouseName} en Mostrador antes de recibir un
          abono.
        </p>
      )}
      <Field
        label="Efectivo recibido (pesos)"
        hint="Solo efectivo. No puede ser más que el saldo y salda primero los pedidos más antiguos."
      >
        <FieldInput
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap justify-end gap-3">
        <ActionButton onClick={() => setText(centsToPesosText(balanceCents))}>
          Pagar todo el saldo
        </ActionButton>
        <ActionButton onClick={onClose}>Cancelar</ActionButton>
        <ActionButton
          tone="primary"
          disabled={busy || !drawerOpen}
          onClick={submit}
        >
          Registrar abono
        </ActionButton>
      </div>
    </CounterDialog>
  )
}
