import { Link, useLocation } from '@tanstack/react-router'
import { Trash2Icon, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { formatCents } from '#/modules/pricing/lib/money'
import { QuantityStepper } from '#/modules/store/components/quantity-stepper'
import { ReservationTag } from '#/modules/store/components/reservation-tag'
import { useCartPreview } from '#/modules/store/hooks/use-cart-preview'
import { useReserveOrder } from '#/modules/store/hooks/use-reserve-order'
import type { useStoreCart } from '#/modules/store/hooks/use-store-cart'
import { listTotal, resolveCartLines } from '#/modules/store/lib/pick-list'
import type { PickLine } from '#/modules/store/lib/pick-list'
import { canAddToCart } from '#/modules/store/lib/store-labels'
import type {
  StoreOrder,
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

  const { resolved, gone } = useMemo(
    () => resolveCartLines(catalog, cart.lines),
    [catalog, cart.lines],
  )
  const soldOut = resolved.some(
    ({ presentation }) => !canAddToCart(presentation.availability),
  )
  const payload = resolved.map(({ presentation, quantity }) => ({
    presentationId: presentation.id,
    quantity,
  }))

  const preview = useCartPreview(warehouse.id, payload, signedIn)
  const priceOf = (item: PickLine) => {
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
      : listTotal(resolved)
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
      ? 'Hoja de surtido'
      : step === 'confirm'
        ? 'Confirma tu apartado'
        : 'Pedido apartado'

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        showCloseButton={false}
        className="store w-full gap-0 rounded-none border-l-2 border-rb-graphite bg-rb-ground p-0 text-rb-graphite shadow-none data-[side=right]:w-full data-[side=right]:sm:max-w-[28rem]"
        aria-describedby="cart-description"
      >
        <SheetHeader className="rb-dark flex-row items-start justify-between gap-3 bg-rb-graphite p-4 text-rb-label">
          <div className="min-w-0">
            <SheetTitle className="rb-stencil text-[24px] leading-none text-rb-label">
              {title}
            </SheetTitle>
            <SheetDescription
              id="cart-description"
              className="mt-1.5 text-[14px] text-rb-label/85"
            >
              Recoges en {warehouse.name}
            </SheetDescription>
          </div>
          <SheetClose
            className="grid size-11 shrink-0 place-items-center border-2 border-rb-label/60 hover:bg-rb-graphite-soft"
            aria-label="Cerrar"
          >
            <XIcon className="size-5" strokeWidth={2.5} aria-hidden />
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {step === 'done' && placed ? (
            <div className="grid gap-4">
              <ReservationTag order={placed} />
              <Link
                to="/tienda/pedidos"
                search={{ almacen: warehouse.id }}
                onClick={() => handleOpenChange(false)}
                className="rb-btn rb-btn--outline"
              >
                Ver mis pedidos
              </Link>
            </div>
          ) : !resolved.length && !gone.length ? (
            <div className="grid gap-1 border-2 border-dashed border-rb-graphite-soft bg-rb-label p-8 text-center">
              <p className="rb-stencil text-xl">Tu hoja está vacía</p>
              <p className="text-sm text-rb-muted">
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
                const unit = priceOf(item)
                const discounted = unit < item.presentation.priceCents
                return (
                  <li key={item.presentation.id} className="rb-block grid">
                    <div className="flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="text-[15px] leading-tight font-semibold">
                          {item.product.name}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[14px] text-rb-muted">
                          <span>{item.presentation.name}</span>
                          <span className="rb-num text-rb-graphite">
                            {pricesPending ? '…' : formatCents(unit)}
                          </span>
                          {discounted && !pricesPending ? (
                            <s className="rb-num text-[13px]">
                              {formatCents(item.presentation.priceCents)}
                            </s>
                          ) : null}
                        </p>
                        {unavailable ? (
                          <p className="mt-1 text-[14px] font-semibold text-rb-beam-text">
                            Agotado: quítalo para continuar.
                          </p>
                        ) : null}
                      </div>
                      <p className="rb-num shrink-0 text-[19px]">
                        {pricesPending
                          ? '…'
                          : formatCents(unit * item.quantity)}
                      </p>
                    </div>
                    {step === 'cart' ? (
                      <div className="flex items-start justify-between gap-2 border-t border-rb-rule bg-rb-ground/50 px-3 py-2">
                        <QuantityStepper
                          value={item.quantity}
                          min={1}
                          label={label}
                          onChange={(value) =>
                            cart.setQuantity(item.presentation.id, value)
                          }
                        />
                        <button
                          type="button"
                          className="rb-btn rb-btn--quiet min-h-11 px-2 text-[15px]"
                          aria-label={`Quitar ${label}`}
                          onClick={() => cart.remove(item.presentation.id)}
                        >
                          <Trash2Icon className="size-4" aria-hidden />
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <p className="border-t border-rb-rule px-3 py-2 text-[14px] text-rb-muted">
                        Cantidad:{' '}
                        <span className="rb-num text-rb-graphite">
                          {item.quantity}
                        </span>
                      </p>
                    )}
                  </li>
                )
              })}
              {step === 'cart'
                ? gone.map((presentationId) => (
                    <li
                      key={presentationId}
                      className="flex items-center justify-between gap-3 border-2 border-dashed border-rb-graphite-soft p-3"
                    >
                      <p className="text-sm text-rb-muted">
                        Un producto ya no está disponible en este almacén.
                      </p>
                      <button
                        type="button"
                        className="rb-btn rb-btn--quiet min-h-11 px-2 text-[15px]"
                        onClick={() => cart.remove(presentationId)}
                      >
                        Quitar
                      </button>
                    </li>
                  ))
                : null}
            </ul>
          )}

          {step === 'confirm' ? (
            <div className="mt-4 grid gap-4">
              <div className="rb-plate p-3.5">
                <p className="rb-stencil text-[19px] leading-tight">
                  Esto es un apartado, no una compra
                </p>
                <p className="mt-1.5 text-[14px] leading-snug font-medium">
                  No pagas nada en línea. Recoges tu pedido y lo pagas en el
                  almacén. Si no lo recoges a tiempo, el apartado vence y los
                  productos vuelven al inventario.
                </p>
              </div>
              <label className="grid gap-1.5">
                <span className="rb-label">
                  Nota para el almacén (opcional)
                </span>
                <textarea
                  value={notes}
                  maxLength={500}
                  onChange={(event) => setNotes(event.target.value)}
                  className="rb-field min-h-20"
                />
              </label>
            </div>
          ) : null}
        </div>

        {step !== 'done' && (resolved.length || gone.length) ? (
          <SheetFooter className="mt-0 gap-3 border-t-2 border-rb-graphite bg-rb-label p-4">
            <div className="flex items-baseline justify-between">
              <span className="rb-label">
                {signedIn ? 'Total con tus precios' : 'Total a precio de lista'}
              </span>
              <span key={total} className="rb-num rb-tick text-[30px]">
                {pricesPending ? '…' : formatCents(total)}
              </span>
            </div>

            {signedIn && preview.status === 'error' ? (
              <p
                role="alert"
                className="border-2 border-rb-beam-text bg-[#f6e3da] p-2.5 text-sm font-medium text-rb-beam-text"
              >
                {preview.message}
              </p>
            ) : null}

            {!signedIn ? (
              <>
                <p className="text-[14px] text-rb-muted">
                  Los precios pueden cambiar cuando entras con tu cuenta. Para
                  apartar necesitas una cuenta de cliente.
                </p>
                <Link
                  to="/tienda/entrar"
                  search={{ redirect: location.href }}
                  onClick={() => handleOpenChange(false)}
                  className="rb-btn"
                >
                  Inicia sesión para apartar
                </Link>
              </>
            ) : step === 'cart' ? (
              <>
                <p className="text-[14px] text-rb-muted">
                  Es un apartado: lo recoges y lo pagas en el almacén.
                </p>
                <button
                  type="button"
                  className="rb-btn"
                  disabled={blocked}
                  onClick={() => setStep('confirm')}
                >
                  Revisar y apartar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rb-btn"
                  disabled={blocked || pending}
                  onClick={() => void confirm()}
                >
                  {pending ? 'Apartando…' : 'Apartar pedido'}
                </button>
                <button
                  type="button"
                  className="rb-btn rb-btn--quiet"
                  disabled={pending}
                  onClick={() => setStep('cart')}
                >
                  Volver a la hoja
                </button>
              </>
            )}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
