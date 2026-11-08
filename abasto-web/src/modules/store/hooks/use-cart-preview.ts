import { useEffect, useState } from 'react'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { CartLine } from '#/modules/store/lib/cart'
import { previewStoreCartFn } from '#/modules/store/server/storefront'
import type { StoreQuotePreview } from '#/modules/store/services/storefront'

export type CartPreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; preview: StoreQuotePreview }
  | { status: 'error'; message: string }

/**
 * The signed-in customer's own prices for a cart. Anonymous sessions never
 * call the server (they see list prices).
 */
export function useCartPreview(
  warehouseId: string,
  lines: Array<CartLine>,
  enabled: boolean,
): CartPreviewState {
  const [state, setState] = useState<CartPreviewState>({ status: 'idle' })
  const key = JSON.stringify([warehouseId, lines])

  useEffect(() => {
    if (!enabled || !lines.length) {
      setState({ status: 'idle' })
      return
    }
    let current = true
    setState({ status: 'loading' })
    previewStoreCartFn({ data: { warehouseId, lines } })
      .then((result) => {
        if (current) setState({ status: 'ready', preview: unwrap(result) })
      })
      .catch((failure: unknown) => {
        if (!current) return
        setState({
          status: 'error',
          message:
            failure instanceof ClientError
              ? failure.message
              : genericErrorMessage,
        })
      })
    return () => {
      current = false
    }
    // `key` captures warehouseId and lines by value.
  }, [key, enabled])

  return state
}
