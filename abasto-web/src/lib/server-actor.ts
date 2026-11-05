import { getRequestHeaders } from '@tanstack/react-start/server'
import { runBoundary } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import type { Actor } from '#/modules/access/lib/policy'
import { requireActor } from '#/modules/access/services/access'

/**
 * Body of every authenticated server function: resolves the actor from the
 * current request's session, then maps failures to a client-safe `Result`.
 */
export function runWithActor<T>(
  run: (actor: Actor) => Promise<T>,
): Promise<Result<T>> {
  return runBoundary(async () => run(await requireActor(getRequestHeaders())))
}
