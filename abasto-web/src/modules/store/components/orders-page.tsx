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
    <div className="grid justify-items-center gap-1 border-2 border-dashed border-rb-graphite-soft bg-rb-label p-8 text-center">
      <p className="rb-stencil text-xl">{title}</p>
      <p className="max-w-md text-sm text-rb-muted">{children}</p>
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
          className="rb-btn justify-self-center"
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
      <h1 className="rb-stencil text-[32px] leading-none">Mis pedidos</h1>
      {orders.length ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rb-block grid content-start gap-4 p-4"
            >
              <OrderSummary order={order} />
              {canCancelOrder(order.status) ? (
                <button
                  type="button"
                  className="rb-btn rb-btn--danger"
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
        <AlertDialogContent className="store rounded-none border-2 border-rb-graphite bg-rb-label ring-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="rb-stencil text-xl">
              ¿Cancelar {target ? storeOrderCode(target.id) : 'el apartado'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-rb-muted">
              Los productos se liberan para otros clientes. Para volver a
              apartarlos tendrás que hacer un pedido nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogPrimitive.Cancel className="rb-btn rb-btn--outline">
              Conservar apartado
            </AlertDialogPrimitive.Cancel>
            <button
              type="button"
              className="rb-btn rb-btn--danger"
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
