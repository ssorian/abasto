import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { genericErrorMessage } from '#/lib/boundary'
import { toSessionUser } from '#/modules/access/lib/session-user'

/** Signed-in user for the current request, or null. Used by the route guard. */
export const getSessionUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    let current: Awaited<ReturnType<typeof auth.api.getSession>>
    try {
      current = await auth.api.getSession({ headers: getRequestHeaders() })
    } catch (error) {
      // Never let the raw failure (e.g. database down) reach the client.
      console.error('Session lookup failed', error)
      throw new Error(genericErrorMessage)
    }
    if (!current) return null
    const { name, email, role } = current.user
    return toSessionUser({ name, email, role: String(role) })
  },
)
