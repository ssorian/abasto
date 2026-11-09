import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { Field, FieldInput } from '#/modules/inventory/components/form-controls'
import { FormError } from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { useRiderActions } from '#/modules/riders/hooks/use-rider-actions'
import type { Rider } from '#/modules/riders/services/riders'

type RiderDialogProps = {
  warehouseId: string
  /** The rider being renamed; absent when adding a new one. */
  rider?: Rider
  onClose: () => void
}

/** Adds a rider to the catalog or renames one. */
export function RiderDialog({ warehouseId, rider, onClose }: RiderDialogProps) {
  const actions = useRiderActions()
  const [name, setName] = useState(rider?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit() {
    if (!name.trim()) return setError('Escribe el nombre del repartidor.')
    setError(null)
    setPending(true)
    const result = rider
      ? await actions.renameRider(rider.id, name)
      : await actions.createRider(warehouseId, name)
    setPending(false)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title={rider ? 'Renombrar repartidor' : 'Nuevo repartidor'}
      description="Solo es un nombre para asignarle producto; no necesita cuenta ni acceso."
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field label="Nombre">
          <FieldInput
            autoFocus
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={pending}>
            {rider ? 'Guardar nombre' : 'Agregar repartidor'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}
