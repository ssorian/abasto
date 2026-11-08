import { createFileRoute } from '@tanstack/react-router'

import { safeRedirect } from '#/modules/access/lib/redirect'
import { StoreLoginPage } from '#/modules/store/components/store-login-page'

export const Route = createFileRoute('/tienda/entrar')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    search.redirect === undefined
      ? {}
      : { redirect: safeRedirect(search.redirect) },
  head: () => ({ meta: [{ title: 'Entrar · Tienda' }] }),
  component: function StoreLogin() {
    const { redirect } = Route.useSearch()
    // safeRedirect falls back to "/", which is a staff page: use the store.
    return (
      <StoreLoginPage
        redirectTo={redirect && redirect !== '/' ? redirect : '/tienda'}
      />
    )
  },
})
