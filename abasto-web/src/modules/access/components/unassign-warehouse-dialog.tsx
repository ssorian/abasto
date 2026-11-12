import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'

type UnassignWarehouseDialogProps = {
  userName: string
  warehouseName: string
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Confirms removing a warehouse from a user; closing keeps the assignment. */
export function UnassignWarehouseDialog({
  userName,
  warehouseName,
  pending,
  onConfirm,
  onClose,
}: UnassignWarehouseDialogProps) {
  return (
    <InventoryDialog
      title={`¿Quitar ${warehouseName} a ${userName}?`}
      description={`${userName} deja de ver y operar ${warehouseName}. Puedes volver a asignarlo después.`}
      onClose={onClose}
    >
      <DialogActions>
        <ActionButton type="button" onClick={onClose}>
          Conservar almacén
        </ActionButton>
        <ActionButton
          tone="primary"
          type="button"
          disabled={pending}
          onClick={onConfirm}
        >
          Quitar almacén
        </ActionButton>
      </DialogActions>
    </InventoryDialog>
  )
}
