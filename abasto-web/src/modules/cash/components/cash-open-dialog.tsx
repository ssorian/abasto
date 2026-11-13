import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ActionButton } from '#/modules/counter/components/action-button'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import { Field, FieldInput } from '#/modules/counter/components/form-controls'
import { useCashActions } from '#/modules/cash/hooks/use-cash-actions'
import { lastCloseHint } from '#/modules/cash/lib/cash-summary'
import { parsePesosToCents } from '#/modules/inventory/lib/cents'

type CashOpenDialogProps = {
  warehouseId: string
  warehouseName: string
  onClose: () => void
}

export function CashOpenDialog({
  warehouseId,
  warehouseName,
  onClose,
}: CashOpenDialogProps) {
  const actions = useCashActions(warehouseId)
  const [text, setText] = useState('')
  const [lastCounted, setLastCounted] = useState<number | null>(null)

  useEffect(() => {
    // Only owner and manager may read it; for anyone else there is just no hint.
    actions.lastClose().then(setLastCounted, () => setLastCounted(null))
    // Loaded once per warehouse.
  }, [warehouseId])

  async function submit() {
    const opening = parsePesosToCents(text, { allowZero: true })
    if (!opening.ok) return void toast.error(opening.message)
    await actions.open(opening.value, onClose)
  }

  return (
    <CounterDialog
      title="Abrir caja"
      description={`Cuenta el efectivo con el que empiezas en ${warehouseName}.`}
      onClose={onClose}
    >
      <Field
        label="Efectivo inicial (pesos)"
        hint={[
          lastCloseHint(lastCounted),
          'Escribe 0 si empiezas sin efectivo.',
        ]
          .filter(Boolean)
          .join('. ')}
      >
        <FieldInput
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-3">
        <ActionButton onClick={onClose}>Cancelar</ActionButton>
        <ActionButton
          tone="primary"
          disabled={actions.pending}
          onClick={submit}
        >
          Abrir caja
        </ActionButton>
      </div>
    </CounterDialog>
  )
}
