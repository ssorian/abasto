import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import { cancelMyOrderFn } from '#/modules/store/server/storefront'

/** Cancels the customer's own Reservado order and refreshes the list. */
export function useCancelOrder() {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const cancel = async (orderId: string) => {
    setPendingId(orderId)
    try {
      unwrap(await cancelMyOrderFn({ data: { orderId } }))
      toast.success('Apartado cancelado.', { position: 'top-center' })
      await router.invalidate()
    } catch (failure) {
      toast.error(
        failure instanceof ClientError ? failure.message : genericErrorMessage,
        { position: 'top-center' },
      )
      // The order may have moved on (e.g. already prepared): show the truth.
      await router.invalidate()
    } finally {
      setPendingId(null)
    }
  }

  return { cancel, pendingId }
}
