export type RouteRole = 'owner' | 'staff' | 'customer'

export type RouteAccess =
  | { kind: 'allow' }
  | { kind: 'redirect'; to: '/login' | '/tienda' | '/'; keepTarget: boolean }

/** The customer store lives under `/tienda` and is public. */
export const isStorePath = (pathname: string) =>
  pathname === '/tienda' || pathname.startsWith('/tienda/')

const allow: RouteAccess = { kind: 'allow' }
const redirectTo = (
  to: '/login' | '/tienda' | '/',
  keepTarget = false,
): RouteAccess => ({ kind: 'redirect', to, keepTarget })

/**
 * Who may open a path. Staff pages need a staff/owner session; customers only
 * live in the store; the store is open to everyone (reserving is enforced by
 * the server).
 */
export function decideRouteAccess(
  role: RouteRole | null,
  pathname: string,
): RouteAccess {
  if (isStorePath(pathname)) return allow
  if (pathname === '/login') {
    if (!role) return allow
    return redirectTo(role === 'customer' ? '/tienda' : '/')
  }
  if (!role) return redirectTo('/login', true)
  if (role === 'customer') return redirectTo('/tienda')
  return allow
}
