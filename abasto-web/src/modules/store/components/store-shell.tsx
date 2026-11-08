import {
  Link,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { authClient } from '#/lib/auth-client'
import type { SessionUser } from '#/modules/access/lib/session-user'
import { CartSheet } from '#/modules/store/components/cart-sheet'
import { PickListBar } from '#/modules/store/components/pick-list-bar'
import { PickListPanel } from '#/modules/store/components/pick-list-panel'
import { useStoreCart } from '#/modules/store/hooks/use-store-cart'
import { listTotal, resolveCartLines } from '#/modules/store/lib/pick-list'
import { storeConfig } from '#/modules/store/lib/store-config'
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
  'inline-flex min-h-11 items-center border-b-[3px] border-transparent px-1 text-[15px] font-semibold text-st-muted hover:text-st-plum-ink aria-[current=page]:border-st-brand aria-[current=page]:text-st-plum-ink'

/** Graphite bar, page, pick list and footer shared by every `/tienda` page. */
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

  const { resolved } = useMemo(
    () => resolveCartLines(catalog, cart.lines),
    [catalog, cart.lines],
  )
  const totalCents = listTotal(resolved)
  const isCatalog = location.pathname === '/tienda'
  const isLogin = location.pathname === '/tienda/entrar'
  const showBar =
    warehouse !== null && !isLogin && (isCatalog || cart.count > 0)

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
    <div className="store flex min-h-dvh flex-col bg-st-ground">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-st-brand focus:px-4 focus:py-3 focus:font-semibold focus:text-white"
      >
        Saltar al contenido
      </a>
      <header className="z-30 border-b border-st-line bg-st-card text-st-ink lg:sticky lg:top-0">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-6 px-4 lg:min-h-14 lg:flex-nowrap">
          <Link
            to="/tienda"
            search={(prev) => ({ almacen: prev.almacen })}
            className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 lg:flex-none"
          >
            <span
              aria-hidden
              className="block size-3.5 shrink-0 rounded-full bg-st-brand"
            />
            <span className="truncate text-[17px] leading-none font-bold text-st-plum-ink sm:text-[19px]">
              {storeConfig.name}
            </span>
          </Link>
          <nav
            aria-label="Tienda"
            className="order-last flex w-full gap-5 lg:order-none lg:w-auto"
          >
            <Link
              to="/tienda"
              search={(prev) => ({ almacen: prev.almacen })}
              activeOptions={{ exact: true }}
              className={navLink}
            >
              Catálogo
            </Link>
            <Link
              to="/tienda/pedidos"
              search={(prev) => ({ almacen: prev.almacen })}
              className={navLink}
            >
              Mis pedidos
            </Link>
          </nav>
          <div className="flex items-center gap-1 lg:ml-auto">
            {user ? (
              <>
                <span className="hidden max-w-[12rem] truncate text-sm font-semibold sm:inline">
                  {user.name}
                </span>
                <button
                  type="button"
                  className="st-btn st-btn--quiet min-h-11 px-3 text-[15px]"
                  disabled={signingOut}
                  onClick={() => void signOut()}
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/tienda/entrar"
                search={{ redirect: location.href }}
                className="st-btn st-btn--quiet min-h-11 px-3 text-[15px]"
              >
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Iniciar sesión</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div
        className={
          isCatalog && warehouse
            ? 'mx-auto grid w-full max-w-[1360px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-6 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_352px] lg:py-6'
            : 'mx-auto w-full max-w-[1360px] flex-1 px-4 py-4 lg:py-6'
        }
      >
        <main id="contenido" className="min-w-0">
          {children}
        </main>
        {isCatalog && warehouse ? (
          <PickListPanel
            warehouseName={warehouse.name}
            lines={resolved}
            totalCents={totalCents}
            onSet={cart.setQuantity}
            onReview={() => setCartOpen(true)}
          />
        ) : null}
      </div>

      <footer
        className={`border-t border-st-line px-4 py-6 text-center text-[13px] text-st-muted ${showBar ? 'pb-28 lg:pb-6' : ''}`}
      >
        {storeConfig.name} · {storeConfig.location}. Los pedidos son apartados:
        se recogen y se pagan en el almacén.
      </footer>

      {warehouse ? (
        <>
          {showBar ? (
            <PickListBar
              units={cart.count}
              totalCents={totalCents}
              onReview={() => setCartOpen(true)}
            />
          ) : null}
          <CartSheet
            open={cartOpen}
            onOpenChange={setCartOpen}
            warehouse={warehouse}
            catalog={catalog}
            cart={cart}
            signedIn={user !== null}
          />
        </>
      ) : null}
    </div>
  )
}
