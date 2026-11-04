import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

import { createInitialState } from '#/modules/inventory/lib/seed'

import type { InventoryState } from '#/modules/inventory/types/inventory'

export type ApplyOperation = (
  operation: (state: InventoryState) => InventoryState,
  message: string,
) => boolean

/**
 * Local Inventario state. `apply` runs a pure operation, reports its result with a
 * toast and returns whether it was registered.
 */
export function useInventoryState() {
  const [state, setState] = useState(createInitialState)
  const latest = useRef(state)

  const apply = useCallback<ApplyOperation>((operation, message) => {
    try {
      const next = operation(latest.current)
      latest.current = next
      setState(next)
      toast.success(message)
      return true
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Operación no válida.',
      )
      return false
    }
  }, [])

  return { state, apply }
}
