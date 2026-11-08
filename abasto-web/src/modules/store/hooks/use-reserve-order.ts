import { useState } from 'react'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { CartLine } from '#/modules/store/lib/cart'
import { placeStoreOrderFn } from '#/modules/store/server/storefront'
import type { StoreOrder } from '#/modules/store/services/storefront'

/** Confirms the cart as a reservation; the caller clears the cart on success. */
export function useReserveOrder() {
  const [pending, setPending] = useState(false)

  const reserve = async (
    warehouseId: string,
    lines: Array<CartLine>,
    notes: string,
  ): Promise<StoreOrder | null> => {
    setPending(true)
    try {
      const note = notes.trim()
      return unwrap(
        await placeStoreOrderFn({
          data: { warehouseId, lines, ...(note ? { notes: note } : {}) },
        }),
      )
    } catch (failure) {
      toast.error(
        failure instanceof ClientError ? failure.message : genericErrorMessage,
        { position: 'top-center' },
      )
      return null
    } finally {
      setPending(false)
    }
  }

  return { reserve, pending }
}
