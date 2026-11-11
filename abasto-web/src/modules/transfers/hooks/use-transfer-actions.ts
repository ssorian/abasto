import { useActionRunner } from '#/hooks/use-action-runner'
import {
  cancelTransferFn,
  dispatchTransferFn,
  receiveTransferFn,
} from '#/modules/transfers/server/transfers'

/**
 * Write actions of the Traslados tab. Each resolves to `{ data }` on success
 * (lists reloaded, success toast shown) or to `undefined` after showing the
 * server message. `pending` is true while one runs.
 */
export function useTransferActions() {
  const run = useActionRunner()
  return {
    pending: run.pending,
    dispatch: (input: {
      fromWarehouseId: string
      toWarehouseId: string
      notes: string
      items: Array<{ productId: string; quantity: number }>
    }) => run(() => dispatchTransferFn({ data: input }), 'Traslado enviado.'),
    receive: (input: {
      transferId: string
      lines: Array<{ lineId: string; receivedQuantity: number }>
    }) => run(() => receiveTransferFn({ data: input }), 'Traslado recibido.'),
    cancel: (transferId: string) =>
      run(
        () => cancelTransferFn({ data: { transferId } }),
        'Traslado cancelado. El producto regresó a sus lotes de origen.',
      ),
  }
}
