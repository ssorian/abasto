import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import type { SupplierOrderSummary } from '#/modules/inventory/services/supplier-orders'

type CancelOrderDialogProps = {
  order: SupplierOrderSummary
  onClose: () => void
}

/** Confirms cancelling an order that has not arrived. */
export function CancelOrderDialog({ order, onClose }: CancelOrderDialogProps) {
  const actions = useInventoryActions()

  async function confirm() {
    const result = await actions.cancelOrder(order.id)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title="Cancelar pedido"
      description={`El pedido a ${order.supplierName} se cancela y ya no se podrá recibir. Las existencias no cambian.`}
      onClose={onClose}
    >
      <DialogActions>
        <ActionButton type="button" onClick={onClose}>
          Conservar pedido
        </ActionButton>
        <ActionButton
          tone="primary"
          type="button"
          disabled={actions.pending}
          onClick={() => void confirm()}
        >
          Cancelar pedido
        </ActionButton>
      </DialogActions>
    </InventoryDialog>
  )
}
