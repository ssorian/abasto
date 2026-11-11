import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { useTransferActions } from '#/modules/transfers/hooks/use-transfer-actions'
import { cancelDescription } from '#/modules/transfers/lib/transfer-labels'
import type { TransferListItem } from '#/modules/transfers/services/transfer-reads'

type CancelTransferDialogProps = {
  transfer: TransferListItem
  onClose: () => void
}

/** Confirms cancelling a transfer still in transit. */
export function CancelTransferDialog({
  transfer,
  onClose,
}: CancelTransferDialogProps) {
  const actions = useTransferActions()

  async function confirm() {
    const result = await actions.cancel(transfer.id)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title="Cancelar traslado"
      description={cancelDescription(transfer)}
      onClose={onClose}
    >
      <DialogActions>
        <ActionButton type="button" onClick={onClose}>
          Conservar traslado
        </ActionButton>
        <ActionButton
          tone="primary"
          type="button"
          disabled={actions.pending}
          onClick={() => void confirm()}
        >
          Cancelar traslado
        </ActionButton>
      </DialogActions>
    </InventoryDialog>
  )
}
