import { useActionRunner } from '#/modules/cash/hooks/use-action-runner'
import {
  assignRiderFn,
  cancelAssignmentFn,
  createRiderFn,
  renameRiderFn,
  setRiderActiveFn,
  settleAssignmentFn,
} from '#/modules/riders/server/riders'
import type { AssignInput } from '#/modules/riders/lib/assign-draft'

type SettleInput = {
  assignmentId: string
  deliveredCents: number
  lines: Array<{ lineId: string; boxes: number; units: number }>
}

/**
 * Write actions of Repartos. Each resolves to `{ data }` on success (the page
 * reloads) or to `undefined` after showing the server message as a toast.
 */
export function useRiderActions() {
  const run = useActionRunner()
  return {
    createRider: (warehouseId: string, name: string) =>
      run(
        () => createRiderFn({ data: { warehouseId, name } }),
        'Repartidor agregado.',
      ),
    renameRider: (riderId: string, name: string) =>
      run(
        () => renameRiderFn({ data: { riderId, name } }),
        'Nombre actualizado.',
      ),
    setActive: (riderId: string, active: boolean) =>
      run(
        () => setRiderActiveFn({ data: { riderId, active } }),
        active ? 'Repartidor activado.' : 'Repartidor desactivado.',
      ),
    assign: (input: AssignInput) =>
      run(
        () => assignRiderFn({ data: input }),
        'Reparto asignado. El producto quedó apartado.',
      ),
    settle: (input: SettleInput) =>
      run(
        () => settleAssignmentFn({ data: input }),
        'Reparto liquidado. La venta quedó en la caja.',
      ),
    cancel: (assignmentId: string) =>
      run(
        () => cancelAssignmentFn({ data: { assignmentId } }),
        'Reparto cancelado. El producto regresó al almacén.',
      ),
  }
}
