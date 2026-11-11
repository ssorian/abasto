import { useRouter } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { runAction } from '#/hooks/use-action-runner'
import type { Result } from '#/lib/boundary'

/**
 * Same write flow as `useActionRunner` (refresh lists, Spanish success toast),
 * but a failure is returned instead of toasted so the dialog that triggered
 * the save can show it next to its fields. Resolves to the error message, or
 * null when the write worked.
 */
export function useInlineAction() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const run = useCallback(
    async <T>(
      action: () => Promise<Result<T>>,
      success?: string,
    ): Promise<string | null> => {
      let failure: string | null = null
      setPending(true)
      try {
        await runAction(
          action,
          { success },
          {
            invalidate: () => router.invalidate(),
            notifySuccess: (message) => toast.success(message),
            notifyError: (message) => {
              failure = message
            },
          },
        )
      } finally {
        setPending(false)
      }
      return failure
    },
    [router],
  )
  return Object.assign(run, { pending })
}
