import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { useRiderActions } from '#/modules/riders/hooks/use-rider-actions'
import type { AssignmentDetail } from '#/modules/riders/services/assignment-reads'

type CancelAssignmentDialogProps = {
  assignment: AssignmentDetail
  onClose: () => void
}

/** Confirms cancelling an assignment still "En ruta". */
export function CancelAssignmentDialog({
  assignment,
  onClose,
}: CancelAssignmentDialogProps) {
  const actions = useRiderActions()
  const [pending, setPending] = useState(false)

  async function confirm() {
    setPending(true)
    const result = await actions.cancel(assignment.id)
    setPending(false)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title="Cancelar reparto"
      description={`Todo el producto asignado a ${assignment.riderName} vuelve a estar disponible en el almacén. No se registra venta ni dinero.`}
      onClose={onClose}
    >
      <DialogActions>
        <ActionButton type="button" onClick={onClose}>
          Conservar reparto
        </ActionButton>
        <ActionButton
          tone="primary"
          type="button"
          disabled={pending}
          onClick={() => void confirm()}
        >
          Cancelar reparto
        </ActionButton>
      </DialogActions>
    </InventoryDialog>
  )
}
