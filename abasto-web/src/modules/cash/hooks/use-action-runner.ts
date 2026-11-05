import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'

export const messageOf = (failure: unknown) =>
  failure instanceof ClientError ? failure.message : genericErrorMessage

/**
 * Runs a server-function write. Resolves to `{ data }` on success (the route
 * reloads) or to `undefined` after showing the server message as a toast; the
 * route reloads on failure too, since the world may have changed meanwhile.
 */
export function useActionRunner() {
  const router = useRouter()
  return async function run<T>(
    action: () => Promise<Result<T>>,
    success?: string,
  ): Promise<{ data: T } | undefined> {
    try {
      const data = unwrap(await action())
      await router.invalidate()
      if (success) toast.success(success)
      return { data }
    } catch (failure) {
      toast.error(messageOf(failure))
      await router.invalidate()
      return undefined
    }
  }
}
