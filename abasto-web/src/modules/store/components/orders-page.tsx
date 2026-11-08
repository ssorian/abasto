import { Link, useLocation } from '@tanstack/react-router'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import type { SessionUser } from '#/modules/access/lib/session-user'
import { OrderSummary } from '#/modules/store/components/order-summary'
import { useCancelOrder } from '#/modules/store/hooks/use-cancel-order'
import {
  canCancelOrder,
  storeOrderCode,
} from '#/modules/store/lib/store-labels'
import type { StoreOrder } from '#/modules/store/services/storefront'

type OrdersPageProps = {
  user: SessionUser | null
  /** Null when the session is not a customer. */
  orders: Array<StoreOrder> | null
}

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <div className="grid justify-items-center gap-1 rounded-2xl border border-dashed border-st-line-strong bg-st-card p-8 text-center">
      <p className="st-stencil text-lg">{title}</p>
      <p className="max-w-md text-sm text-st-muted">{children}</p>
    </div>
  )
}

export function OrdersPage({ user, orders }: OrdersPageProps) {
  const location = useLocation()
  const { cancel, pendingId } = useCancelOrder()
  const [target, setTarget] = useState<StoreOrder | null>(null)

  if (!user) {
    return (
      <div className="grid gap-4">
        <Notice title="Inicia sesión para ver tus pedidos">
          Tus apartados aparecen aquí cuando entras con la cuenta que te dio el
          almacén.
        </Notice>
        <Link
          to="/tienda/entrar"
          search={{ redirect: location.href }}
          className="st-btn justify-self-center"
        >
          Iniciar sesión
        </Link>
      </div>
    )
  }
  if (!orders) {
    return (
      <Notice title="Esta sesión no es de cliente">
        Las cuentas del almacén no tienen pedidos en la tienda. Entra con una
        cuenta de cliente para ver y apartar pedidos.
      </Notice>
    )
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-[28px] leading-tight font-bold text-st-plum-ink">
        Mis pedidos
      </h1>
      {orders.length ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="st-block grid content-start gap-4 p-4"
            >
              <OrderSummary order={order} />
              {canCancelOrder(order.status) ? (
                <button
                  type="button"
                  className="st-btn st-btn--danger"
                  disabled={pendingId === order.id}
                  onClick={() => setTarget(order)}
                >
                  {pendingId === order.id ? 'Cancelando…' : 'Cancelar apartado'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Notice title="Aún no tienes pedidos">
          Cuando apartes productos, los verás aquí con su fecha límite para
          recogerlos.
        </Notice>
      )}

      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
      >
        <AlertDialogContent className="store rounded-2xl border border-st-line bg-st-card ring-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="st-stencil text-lg text-st-plum-ink">
              ¿Cancelar {target ? storeOrderCode(target.id) : 'el apartado'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-st-muted">
              Los productos se liberan para otros clientes. Para volver a
              apartarlos tendrás que hacer un pedido nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogPrimitive.Cancel className="st-btn st-btn--outline">
              Conservar apartado
            </AlertDialogPrimitive.Cancel>
            <button
              type="button"
              className="st-btn st-btn--danger"
              onClick={() => {
                const id = target?.id
                setTarget(null)
                if (id) void cancel(id)
              }}
            >
              Cancelar apartado
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
