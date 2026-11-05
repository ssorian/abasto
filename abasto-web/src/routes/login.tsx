import { createFileRoute } from '@tanstack/react-router'

import { LoginPage } from '#/modules/access/components/login-page'
import { safeRedirect } from '#/modules/access/lib/redirect'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      search.redirect === undefined ? undefined : safeRedirect(search.redirect),
  }),
  component: function Login() {
    const { redirect } = Route.useSearch()
    return <LoginPage redirectTo={redirect ?? '/'} />
  },
})
