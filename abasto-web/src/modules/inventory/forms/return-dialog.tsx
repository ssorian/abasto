import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  Field,
  FieldInput,
  FieldSelect,
} from '#/modules/inventory/components/form-controls'
import { FormError } from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import { formatCents } from '#/modules/inventory/lib/cents'
import { returnInputFromDraft } from '#/modules/inventory/lib/pending-return'
import type { ReturnResolution } from '#/modules/inventory/db/schema'
import type { PendingBalance } from '#/modules/inventory/services/supplier-pendings'

type ReturnDialogProps = {
  pending: PendingBalance
  onClose: () => void
}

/** The supplier took damaged or expired boxes back: replaced them or credited an amount. */
export function ReturnDialog({ pending, onClose }: ReturnDialogProps) {
  const actions = useInventoryActions()
  const [boxes, setBoxes] = useState(String(pending.owedBoxes))
  const [resolution, setResolution] = useState<ReturnResolution>('replacement')
  const [credit, setCredit] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function confirm() {
    const parsed = returnInputFromDraft({
      pendingId: pending.pendingId,
      owedBoxes: pending.owedBoxes,
      boxes,
      resolution,
      credit,
    })
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    setSaving(true)
    const result = await actions.returnPending(parsed.value, setError)
    setSaving(false)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title="Marcar como devuelto"
      eyebrow={pending.supplierName.toUpperCase()}
      description={`${pending.productName} (${pending.originCode}): el proveedor tiene ${pending.owedBoxes} ${pending.owedBoxes === 1 ? 'caja' : 'cajas'} por devolver, valoradas en ${formatCents(pending.owedValueCents)}. Nada de esto entra al inventario.`}
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void confirm()
        }}
      >
        <Field label="Cajas devueltas">
          <FieldInput
            inputMode="numeric"
            value={boxes}
            onChange={(event) => setBoxes(event.target.value)}
          />
        </Field>
        <Field label="¿Cómo lo resolvió el proveedor?">
          <FieldSelect
            value={resolution}
            onChange={(event) =>
              setResolution(event.target.value as ReturnResolution)
            }
          >
            <option value="replacement">Las repuso</option>
            <option value="discount">Descuento</option>
          </FieldSelect>
        </Field>
        {resolution === 'discount' && (
          <Field
            label="Monto del descuento (opcional)"
            hint="Si lo dejas vacío se usa el valor original de las cajas."
          >
            <FieldInput
              inputMode="decimal"
              placeholder="0.00"
              value={credit}
              onChange={(event) => setCredit(event.target.value)}
            />
          </Field>
        )}
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Confirmar devolución'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}
