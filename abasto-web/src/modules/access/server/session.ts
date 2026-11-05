import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { toSessionUser } from '#/modules/access/lib/session-user'

/** Signed-in user for the current request, or null. Used by the route guard. */
export const getSessionUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const current = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!current) return null
    const { name, email, role } = current.user
    return toSessionUser({ name, email, role: String(role) })
  },
)
