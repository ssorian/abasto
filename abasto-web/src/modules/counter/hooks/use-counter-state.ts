import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

import { createInitialState } from '#/modules/counter/lib/seed'
import { reviewOperation } from '#/modules/counter/lib/review'

import type { OperationReview } from '#/modules/counter/lib/review'
import type { CounterState } from '#/modules/counter/types/counter'

type PendingOperation = {
  before: CounterState
  after: CounterState
  message: string
  review: OperationReview
}

export type ApplyOperation = (
  operation: (state: CounterState) => CounterState,
  message: string,
) => boolean

/**
 * Local Mostrador state. `apply` runs a pure operation, asks for a reason when the
 * review finds sensitive changes, and reports the result with a toast.
 */
export function useCounterState() {
  const [state, setState] = useState(createInitialState)
  const latest = useRef(state)
  const [pending, setPending] = useState<PendingOperation | null>(null)
  const [revision, setRevision] = useState(0)

  const commit = useCallback((next: CounterState) => {
    latest.current = next
    setState(next)
  }, [])

  const apply = useCallback<ApplyOperation>(
    (operation, message) => {
      try {
        const before = latest.current
        const after = operation(before)
        const review = reviewOperation(before, after)
        if (review.needsReason) {
          setPending({ before, after, message, review })
          return false
        }
        commit(after)
        toast.success(message)
        return true
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Operación no válida.',
        )
        return false
      }
    },
    [commit],
  )

  /** Confirms the pending sensitive operation; returns true when it was registered. */
  const authorize = useCallback(() => {
    if (!pending) return false
    if (latest.current !== pending.before) {
      toast.error(
        'Los datos cambiaron. Cierra esta solicitud y revisa nuevamente la operación.',
      )
      return false
    }
    commit(pending.after)
    toast.success(pending.message)
    setPending(null)
    setRevision((value) => value + 1)
    return true
  }, [commit, pending])

  const dismissPending = useCallback(() => setPending(null), [])

  return { state, apply, pending, authorize, dismissPending, revision }
}
