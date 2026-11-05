import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import {
  cancelTransferFn,
  dispatchTransferFn,
  receiveTransferFn,
} from '#/modules/transfers/server/transfers'

const messageOf = (failure: unknown) =>
  failure instanceof ClientError ? failure.message : genericErrorMessage

/**
 * Write actions of the Traslados tab. Each resolves to `{ data }` on success
 * (the page reloads) or to `undefined` after showing the server message.
 */
export function useTransferActions() {
  const router = useRouter()

  async function run<T>(
    action: () => Promise<Result<T>>,
    success: string,
  ): Promise<{ data: T } | undefined> {
    try {
      const data = unwrap(await action())
      await router.invalidate()
      toast.success(success)
      return { data }
    } catch (failure) {
      toast.error(messageOf(failure))
      return undefined
    }
  }

  return {
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
        'Traslado cancelado. Las unidades regresaron al almacén.',
      ),
  }
}
