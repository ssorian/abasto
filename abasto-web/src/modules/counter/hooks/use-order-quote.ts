import { useEffect, useState } from 'react'

import { unwrap } from '#/lib/boundary'
import { parseQuantity } from '#/modules/counter/lib/order-draft'
import type { DraftLine } from '#/modules/counter/lib/order-draft'
import { quoteOrderFn } from '#/modules/counter/server/counter'
import type { QuotePreview } from '#/modules/counter/server/quote-preview'

const DEBOUNCE_MS = 300

export type QuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; quote: QuotePreview }

/**
 * Quote shown while composing an order: the warehouse price after the
 * customer's rule, from the server. Lines with an invalid quantity are skipped.
 */
export function useOrderQuote(
  warehouseId: string,
  customerId: string,
  lines: Array<DraftLine>,
): QuoteState {
  const [state, setState] = useState<QuoteState>({ status: 'idle' })
  const key = lines.map((l) => `${l.presentationId}:${l.quantity}`).join('|')

  useEffect(() => {
    const quotable = lines.flatMap((line) => {
      const quantity = parseQuantity(line.quantity)
      return quantity === null
        ? []
        : [{ presentationId: line.presentationId, quantity }]
    })
    if (!customerId || !warehouseId || !quotable.length) {
      setState({ status: 'idle' })
      return
    }
    let stale = false
    setState({ status: 'loading' })
    const timer = setTimeout(async () => {
      try {
        const quote = unwrap(
          await quoteOrderFn({
            data: { warehouseId, customerId, lines: quotable },
          }),
        )
        if (!stale) setState({ status: 'ready', quote })
      } catch (failure) {
        if (!stale) {
          setState({
            status: 'error',
            message:
              failure instanceof Error
                ? failure.message
                : 'No pudimos cotizar.',
          })
        }
      }
    }, DEBOUNCE_MS)
    return () => {
      stale = true
      clearTimeout(timer)
    }
    // `key` stands for the line contents.
  }, [warehouseId, customerId, key])

  return state
}
