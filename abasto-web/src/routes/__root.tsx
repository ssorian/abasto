import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import { AppShell } from '#/components/layout/app-shell'
import { getSessionUser } from '#/modules/access/server/session'
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ location }) => {
    const user = await getSessionUser()
    const onLogin = location.pathname === '/login'
    if (!user && !onLogin) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    if (user && onLogin) throw redirect({ to: '/' })
    return { user }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Operación mayorista · Abarroteros',
      },
      {
        name: 'description',
        content:
          'Demo Abarroteros: etiquetas por lote, promociones con margen, mostrador, caja, reportes de mermas e importación CSV',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
})

/** The login page renders bare; every other page sits inside the shell. */
function RootLayout() {
  const { user } = Route.useRouteContext()
  const pathname = useLocation({ select: (location) => location.pathname })
  if (!user || pathname === '/login') return <Outlet />
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" richColors />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
