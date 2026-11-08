import { Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
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
    <div className="grid justify-items-center gap-1 rounded-2xl border border-dashed border-input bg-white/60 p-8 text-center">
      <p className="font-semibold text-ink-figure">{title}</p>
      <p className="max-w-md text-sm text-ink-muted">{children}</p>
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
        <Notice title="Inicia sesión para ver tus pedidos.">
          Tus apartados aparecen aquí cuando entras con la cuenta que te dio el
          almacén.
        </Notice>
        <Button
          asChild
          className="mx-auto h-12 rounded-xl bg-primary px-6 font-semibold text-brand-ink hover:bg-brand-hover"
        >
          <Link to="/tienda/entrar" search={{ redirect: location.href }}>
            Iniciar sesión
          </Link>
        </Button>
      </div>
    )
  }
  if (!orders) {
    return (
      <Notice title="Esta sesión no es de cliente.">
        Las cuentas del almacén no tienen pedidos en la tienda. Entra con una
        cuenta de cliente para ver y apartar pedidos.
      </Notice>
    )
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-bold tracking-tight text-ink-heading">
        Mis pedidos
      </h1>
      {orders.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {orders.map((order) => (
            <li
              key={order.id}
              className="grid content-start gap-4 rounded-2xl border border-panel-border bg-white p-4"
            >
              <OrderSummary order={order} />
              {canCancelOrder(order.status) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-status-red/40 font-semibold text-status-red hover:bg-status-red-bg"
                  disabled={pendingId === order.id}
                  onClick={() => setTarget(order)}
                >
                  {pendingId === order.id ? 'Cancelando…' : 'Cancelar apartado'}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Notice title="Aún no tienes pedidos.">
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Cancelar {target ? storeOrderCode(target.id) : 'el apartado'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Los productos se liberan para otros clientes. Para volver a
              apartarlos tendrás que hacer un pedido nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar apartado</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const id = target?.id
                setTarget(null)
                if (id) void cancel(id)
              }}
            >
              Cancelar apartado
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
