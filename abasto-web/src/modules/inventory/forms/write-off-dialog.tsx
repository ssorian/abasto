import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { Field, FieldInput } from '#/modules/inventory/components/form-controls'
import { FormError } from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import { formatCents } from '#/modules/inventory/lib/cents'
import { parseBoxCount } from '#/modules/inventory/lib/box-count'
import { writeOffError } from '#/modules/inventory/lib/pending-writeoff'
import type { PendingBalance } from '#/modules/inventory/services/supplier-pendings'

type WriteOffDialogProps = {
  pending: PendingBalance
  onClose: () => void
}

/** "A lo chino": the supplier stops owing these boxes and their value is discounted from the payment. */
export function WriteOffDialog({ pending, onClose }: WriteOffDialogProps) {
  const actions = useInventoryActions()
  const [text, setText] = useState(String(pending.owedBoxes))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const typed = parseBoxCount(text)
  // Value estimate at the average cost of the owed boxes; the server settles the exact amount.
  const estimate =
    typed.ok && typed.value > 0 && typed.value <= pending.owedBoxes
      ? Math.round((pending.owedValueCents * typed.value) / pending.owedBoxes)
      : null

  async function confirm() {
    const problem = writeOffError(text, pending.owedBoxes)
    if (problem) return setError(problem)
    setError(null)
    setSaving(true)
    const result = await actions.writeOff(
      { pendingId: pending.pendingId, boxes: typed.ok ? typed.value : 0 },
      setError,
    )
    setSaving(false)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title="Descontar del pago (a lo chino)"
      eyebrow={pending.supplierName.toUpperCase()}
      description={`${pending.productName} (${pending.originCode}): el proveedor debe ${pending.owedBoxes} ${pending.owedBoxes === 1 ? 'caja' : 'cajas'}. Las que descuentes ya no se le pagan ni se esperan como reposición. No se puede deshacer.`}
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void confirm()
        }}
      >
        <Field
          label="Cajas a descontar"
          hint={
            estimate === null
              ? undefined
              : `Se descuentan aproximadamente ${formatCents(estimate)} del pago.`
          }
        >
          <FieldInput
            inputMode="numeric"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </Field>
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Confirmar descuento'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}
