import { useRouter } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'

export const messageOf = (failure: unknown) =>
  failure instanceof ClientError ? failure.message : genericErrorMessage

export type ActionOptions<T> = {
  /** Spanish success toast; none is shown when omitted. */
  success?: string
  /** Runs after a successful write and the list refresh (e.g. close a dialog). */
  onSuccess?: (data: T) => void
}

type Effects = {
  invalidate: () => Promise<unknown>
  notifySuccess: (message: string) => void
  notifyError: (message: string) => void
}

/**
 * Framework-free core of the runner: runs a server-function write, refreshes
 * lists, and reports the outcome. Resolves to `{ data }` on success or to
 * `undefined` after showing the server message as an error toast; lists
 * refresh on failure too, since the world may have changed meanwhile.
 */
export async function runAction<T>(
  action: () => Promise<Result<T>>,
  options: ActionOptions<T>,
  effects: Effects,
): Promise<{ data: T } | undefined> {
  try {
    const data = unwrap(await action())
    await effects.invalidate()
    if (options.success) effects.notifySuccess(options.success)
    options.onSuccess?.(data)
    return { data }
  } catch (failure) {
    effects.notifyError(messageOf(failure))
    await effects.invalidate().catch(() => undefined)
    return undefined
  }
}

/**
 * Shared mutation helper. `run(action, success?)` (or `run(action, { success,
 * onSuccess })`) tracks `run.pending`, toasts the outcome, and invalidates the
 * router so lists refresh.
 */
export function useActionRunner() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const run = useCallback(
    async <T>(
      action: () => Promise<Result<T>>,
      options?: string | ActionOptions<T>,
    ) => {
      const resolved =
        typeof options === 'string' ? { success: options } : (options ?? {})
      setPending(true)
      try {
        return await runAction(action, resolved, {
          invalidate: () => router.invalidate(),
          notifySuccess: (message) => toast.success(message),
          notifyError: (message) => toast.error(message),
        })
      } finally {
        setPending(false)
      }
    },
    [router],
  )
  return Object.assign(run, { pending })
}
