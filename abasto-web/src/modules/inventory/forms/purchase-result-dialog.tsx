import { ActionButton } from '#/modules/inventory/components/action-button'
import { SuccessNote } from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { formatQuantity } from '#/modules/inventory/lib/quantity'
import type { PackInfo } from '#/modules/inventory/lib/quantity'

export type PurchaseResult = {
  /** Lots the purchase created, with the product name and how it is counted. */
  lots: Array<{ name: string; code: string; quantity: number; pack: PackInfo }>
}

/** Shows the lots a purchase created. */
export function PurchaseResultDialog({
  result,
  onClose,
}: {
  result: PurchaseResult
  onClose: () => void
}) {
  return (
    <InventoryDialog
      title="Compra registrada"
      description="Las existencias ya están actualizadas."
      onClose={onClose}
    >
      <SuccessNote>
        {result.lots
          .map(
            (lot) =>
              `${lot.name}${lot.code ? ` (lote ${lot.code})` : ''}: +${formatQuantity(lot.quantity, lot.pack)}`,
          )
          .join(' · ')}
      </SuccessNote>
      <DialogActions>
        <ActionButton type="button" onClick={onClose}>
          Listo
        </ActionButton>
      </DialogActions>
    </InventoryDialog>
  )
}
