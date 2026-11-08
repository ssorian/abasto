import {
  Link,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ShoppingBasketIcon } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'
import { workspace } from '#/config/workspace'
import type { SessionUser } from '#/modules/access/lib/session-user'
import { CartSheet } from '#/modules/store/components/cart-sheet'
import { useStoreCart } from '#/modules/store/hooks/use-store-cart'
import type {
  StoreProduct,
  StoreWarehouse,
} from '#/modules/store/services/storefront'

type StoreShellProps = {
  user: SessionUser | null
  warehouse: StoreWarehouse | null
  catalog: Array<StoreProduct>
  children: ReactNode
}

const navLink =
  'inline-flex min-h-11 items-center border-b-2 border-transparent px-1 text-sm font-semibold text-ink-muted transition-colors hover:text-ink-heading'
const navActive = { className: 'border-primary text-ink-heading' }

/** Header, cart and footer shared by every `/tienda` page. */
export function StoreShell({
  user,
  warehouse,
  catalog,
  children,
}: StoreShellProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const location = useLocation()
  const cart = useStoreCart(warehouse?.id ?? '')
  const [cartOpen, setCartOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const signOut = async () => {
    setSigningOut(true)
    try {
      await authClient.signOut()
      await router.invalidate()
      await navigate({ to: '/tienda', search: (prev) => prev })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-topbar-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 pt-3">
          <Link
            to="/tienda"
            search={(prev) => ({ almacen: prev.almacen })}
            className="min-w-0 py-1"
          >
            <span className="block text-[11px] font-bold tracking-[1.5px] text-ink-eyebrow">
              TIENDA
            </span>
            <span className="block truncate text-lg leading-tight font-bold tracking-tight text-ink-heading">
              {workspace.business.name}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-1">
                <span className="max-w-[9rem] truncate text-sm font-semibold text-ink-row">
                  {user.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-xl px-3 text-ink-link"
                  disabled={signingOut}
                  onClick={() => void signOut()}
                >
                  Salir
                </Button>
              </div>
            ) : (
              <Button
                asChild
                variant="ghost"
                className="h-11 rounded-xl px-3 font-semibold text-ink-link"
              >
                <Link to="/tienda/entrar" search={{ redirect: location.href }}>
                  Iniciar sesión
                </Link>
              </Button>
            )}
            {warehouse ? (
              <Button
                type="button"
                onClick={() => setCartOpen(true)}
                className="relative h-11 rounded-xl bg-primary px-3.5 font-semibold text-brand-ink hover:bg-brand-hover"
                aria-label={`Carrito, ${cart.count} ${cart.count === 1 ? 'unidad' : 'unidades'}`}
              >
                <ShoppingBasketIcon aria-hidden />
                <span className="tabular-nums" aria-hidden>
                  {cart.count}
                </span>
              </Button>
            ) : null}
          </div>
        </div>
        <nav aria-label="Tienda" className="mx-auto flex max-w-6xl gap-5 px-4">
          <Link
            to="/tienda"
            search={(prev) => ({ almacen: prev.almacen })}
            activeOptions={{ exact: true }}
            activeProps={navActive}
            className={navLink}
          >
            Catálogo
          </Link>
          <Link
            to="/tienda/pedidos"
            search={(prev) => ({ almacen: prev.almacen })}
            activeProps={navActive}
            className={navLink}
          >
            Mis pedidos
          </Link>
        </nav>
      </header>

      <main
        id="contenido"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6"
      >
        {children}
      </main>

      <footer className="border-t border-footer-border px-4 py-6 text-center text-[13px] text-ink-muted">
        {workspace.business.name} · {workspace.business.location}. Los pedidos
        son apartados: se recogen y se pagan en el almacén.
      </footer>

      {warehouse ? (
        <CartSheet
          open={cartOpen}
          onOpenChange={setCartOpen}
          warehouse={warehouse}
          catalog={catalog}
          cart={cart}
          signedIn={user !== null}
        />
      ) : null}
    </div>
  )
}
