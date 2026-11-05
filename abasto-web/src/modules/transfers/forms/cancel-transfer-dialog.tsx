import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { useTransferActions } from '#/modules/transfers/hooks/use-transfer-actions'
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
  const [pending, setPending] = useState(false)

  async function confirm() {
    setPending(true)
    const result = await actions.cancel(transfer.id)
    setPending(false)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title="Cancelar traslado"
      description={`Las ${transfer.sentTotal} unidades que van hacia ${transfer.toWarehouseName} regresan a sus lotes de origen.`}
      onClose={onClose}
    >
      <DialogActions>
        <ActionButton type="button" onClick={onClose}>
          Conservar traslado
        </ActionButton>
        <ActionButton
          tone="primary"
          type="button"
          disabled={pending}
          onClick={() => void confirm()}
        >
          Cancelar traslado
        </ActionButton>
      </DialogActions>
    </InventoryDialog>
  )
}
