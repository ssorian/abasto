import { Link, useLocation } from '@tanstack/react-router'
import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Textarea } from '#/components/ui/textarea'
import { formatCents } from '#/modules/pricing/lib/money'
import { OrderSummary } from '#/modules/store/components/order-summary'
import { QuantityStepper } from '#/modules/store/components/quantity-stepper'
import { useCartPreview } from '#/modules/store/hooks/use-cart-preview'
import { useReserveOrder } from '#/modules/store/hooks/use-reserve-order'
import type { useStoreCart } from '#/modules/store/hooks/use-store-cart'
import { canAddToCart } from '#/modules/store/lib/store-labels'
import type {
  StoreOrder,
  StorePresentation,
  StoreProduct,
  StoreWarehouse,
} from '#/modules/store/services/storefront'

type Step = 'cart' | 'confirm' | 'done'

type CartSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouse: StoreWarehouse
  catalog: Array<StoreProduct>
  cart: ReturnType<typeof useStoreCart>
  signedIn: boolean
}

type Resolved = {
  product: StoreProduct
  presentation: StorePresentation
  quantity: number
}

const primary =
  'h-12 w-full rounded-xl bg-primary text-base font-semibold text-brand-ink hover:bg-brand-hover'

export function CartSheet({
  open,
  onOpenChange,
  warehouse,
  catalog,
  cart,
  signedIn,
}: CartSheetProps) {
  const location = useLocation()
  const [step, setStep] = useState<Step>('cart')
  const [notes, setNotes] = useState('')
  const [placed, setPlaced] = useState<StoreOrder | null>(null)
  const { reserve, pending } = useReserveOrder()

  const index = new Map(
    catalog.flatMap((product) =>
      product.presentations.map(
        (presentation) => [presentation.id, { product, presentation }] as const,
      ),
    ),
  )
  const resolved: Array<Resolved> = []
  const gone: Array<string> = []
  for (const line of cart.lines) {
    const found = index.get(line.presentationId)
    if (found) resolved.push({ ...found, quantity: line.quantity })
    else gone.push(line.presentationId)
  }
  const soldOut = resolved.some(
    ({ presentation }) => !canAddToCart(presentation.availability),
  )
  const payload = resolved.map(({ presentation, quantity }) => ({
    presentationId: presentation.id,
    quantity,
  }))

  const preview = useCartPreview(warehouse.id, payload, signedIn)
  const priceOf = (item: Resolved) => {
    if (signedIn && preview.status === 'ready') {
      const line = preview.preview.lines.find(
        (entry) => entry.presentationId === item.presentation.id,
      )
      if (line?.unitPriceCents != null) return line.unitPriceCents
    }
    return item.presentation.priceCents
  }
  const pricesPending = signedIn && preview.status === 'loading'
  const total =
    signedIn && preview.status === 'ready'
      ? preview.preview.totalCents
      : resolved.reduce(
          (sum, item) => sum + item.presentation.priceCents * item.quantity,
          0,
        )
  const blocked =
    !resolved.length || soldOut || (signedIn && preview.status !== 'ready')

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setStep('cart')
      setPlaced(null)
    }
  }

  const confirm = async () => {
    const order = await reserve(warehouse.id, payload, notes)
    if (!order) return
    cart.clear()
    setNotes('')
    setPlaced(order)
    setStep('done')
  }

  const title =
    step === 'cart'
      ? 'Tu carrito'
      : step === 'confirm'
        ? 'Confirma tu apartado'
        : 'Pedido apartado'

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="w-full gap-0 bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        aria-describedby="cart-description"
      >
        <SheetHeader className="border-b border-panel-border bg-white p-4 pr-12">
          <SheetTitle className="text-xl font-bold tracking-tight text-ink-heading">
            {title}
          </SheetTitle>
          <SheetDescription id="cart-description">
            Almacén {warehouse.name}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {step === 'done' && placed ? (
            <div className="grid gap-4">
              <p className="rounded-xl bg-status-green-bg p-3 text-sm font-semibold text-status-green">
                Listo, apartamos tu pedido. No pagaste nada: lo recoges y lo
                pagas en el almacén.
              </p>
              <OrderSummary order={placed} />
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link
                  to="/tienda/pedidos"
                  search={{ almacen: warehouse.id }}
                  onClick={() => handleOpenChange(false)}
                >
                  Ver mis pedidos
                </Link>
              </Button>
            </div>
          ) : !resolved.length && !gone.length ? (
            <div className="grid gap-1 rounded-2xl border border-dashed border-input bg-white/60 p-8 text-center">
              <p className="font-semibold text-ink-figure">
                Tu carrito está vacío.
              </p>
              <p className="text-sm text-ink-muted">
                Agrega productos de {warehouse.name} para apartarlos.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {resolved.map((item) => {
                const label = `${item.product.name}, ${item.presentation.name}`
                const unavailable = !canAddToCart(
                  item.presentation.availability,
                )
                return (
                  <li
                    key={item.presentation.id}
                    className="grid gap-3 rounded-xl border border-panel-border bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-row">
                          {item.product.name}
                        </p>
                        <p className="text-[13px] text-ink-muted">
                          {item.presentation.name} ·{' '}
                          {pricesPending ? '…' : formatCents(priceOf(item))}
                        </p>
                        {unavailable ? (
                          <p className="mt-1 text-[13px] font-semibold text-status-red">
                            Agotado: quítalo para continuar.
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold text-ink-figure tabular-nums">
                        {pricesPending
                          ? '…'
                          : formatCents(priceOf(item) * item.quantity)}
                      </p>
                    </div>
                    {step === 'cart' ? (
                      <div className="flex items-center justify-between gap-2">
                        <QuantityStepper
                          value={item.quantity}
                          min={1}
                          label={label}
                          onChange={(value) =>
                            cart.setQuantity(item.presentation.id, value)
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-11 rounded-xl px-3 text-ink-link"
                          aria-label={`Quitar ${label}`}
                          onClick={() => cart.remove(item.presentation.id)}
                        >
                          <Trash2Icon aria-hidden />
                          Quitar
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[13px] text-ink-muted">
                        Cantidad: {item.quantity}
                      </p>
                    )}
                  </li>
                )
              })}
              {step === 'cart'
                ? gone.map((presentationId) => (
                    <li
                      key={presentationId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-input p-3"
                    >
                      <p className="text-sm text-ink-muted">
                        Un producto ya no está disponible en este almacén.
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11 rounded-xl px-3 text-ink-link"
                        onClick={() => cart.remove(presentationId)}
                      >
                        Quitar
                      </Button>
                    </li>
                  ))
                : null}
            </ul>
          )}

          {step === 'confirm' ? (
            <div className="mt-4 grid gap-4">
              <div className="rounded-xl bg-accent p-3 text-sm text-accent-foreground">
                <p className="font-semibold">
                  Esto es un apartado, no una compra.
                </p>
                <p className="mt-1">
                  No pagas nada en línea. Recoges tu pedido y lo pagas en el
                  almacén. Si no lo recoges a tiempo, el apartado vence y los
                  productos vuelven al inventario.
                </p>
              </div>
              <label className="grid gap-1.5 text-sm font-semibold text-ink-row">
                Nota para el almacén (opcional)
                <Textarea
                  value={notes}
                  maxLength={500}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-20 rounded-xl bg-white text-base font-normal"
                />
              </label>
            </div>
          ) : null}
        </div>

        {step !== 'done' && (resolved.length || gone.length) ? (
          <SheetFooter className="mt-0 gap-3 border-t border-panel-border bg-white p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-ink-row">
                {signedIn ? 'Total' : 'Total con precio de lista'}
              </span>
              <span className="text-2xl font-bold tracking-tight text-ink-figure tabular-nums">
                {pricesPending ? '…' : formatCents(total)}
              </span>
            </div>

            {signedIn && preview.status === 'error' ? (
              <p
                role="alert"
                className="rounded-lg bg-status-red-bg p-2.5 text-sm text-status-red"
              >
                {preview.message}
              </p>
            ) : null}

            {!signedIn ? (
              <>
                <p className="text-[13px] text-ink-muted">
                  Los precios pueden cambiar cuando entras con tu cuenta. Para
                  apartar necesitas una cuenta de cliente.
                </p>
                <Button asChild className={primary}>
                  <Link
                    to="/tienda/entrar"
                    search={{ redirect: location.href }}
                    onClick={() => handleOpenChange(false)}
                  >
                    Inicia sesión para apartar
                  </Link>
                </Button>
              </>
            ) : step === 'cart' ? (
              <Button
                type="button"
                className={primary}
                disabled={blocked}
                onClick={() => setStep('confirm')}
              >
                Revisar y apartar
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  className={primary}
                  disabled={blocked || pending}
                  onClick={() => void confirm()}
                >
                  {pending ? 'Apartando…' : 'Apartar pedido'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-xl"
                  disabled={pending}
                  onClick={() => setStep('cart')}
                >
                  Volver al carrito
                </Button>
              </>
            )}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
