import { ShoppingBasketIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { StatusBadge } from '#/components/status-badge'
import { Button } from '#/components/ui/button'
import { formatCents } from '#/modules/pricing/lib/money'
import { QuantityStepper } from '#/modules/store/components/quantity-stepper'
import {
  availabilityTone,
  canAddToCart,
} from '#/modules/store/lib/store-labels'
import type {
  StorePresentation,
  StoreProduct,
} from '#/modules/store/services/storefront'

/** Top placement: bottom toasts would cover the cart bar on phones. */
const toastOptions = { position: 'top-center', duration: 1800 } as const

type ProductCardProps = {
  product: StoreProduct
  onAdd: (presentationId: string, quantity: number) => void
}

function PresentationRow({
  product,
  presentation,
  onAdd,
}: {
  product: StoreProduct
  presentation: StorePresentation
  onAdd: ProductCardProps['onAdd']
}) {
  const [quantity, setQuantity] = useState(1)
  const available = canAddToCart(presentation.availability)
  const label = `${product.name}, ${presentation.name}`
  return (
    <li className="grid gap-3 border-t border-row-border py-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-row">
            {presentation.name}
          </p>
          <StatusBadge
            tone={availabilityTone(presentation.availability)}
            className="mt-1"
          >
            {presentation.availability}
          </StatusBadge>
        </div>
        <p className="text-xl font-bold tracking-tight text-ink-figure tabular-nums">
          {formatCents(presentation.priceCents)}
        </p>
      </div>
      {available ? (
        <div className="flex items-center gap-2">
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            label={label}
          />
          <Button
            type="button"
            className="h-11 flex-1 rounded-xl bg-primary px-3 text-sm font-semibold text-brand-ink hover:bg-brand-hover"
            onClick={() => {
              onAdd(presentation.id, quantity)
              toast.success(`Agregaste ${quantity} × ${label}.`, toastOptions)
              setQuantity(1)
            }}
          >
            <ShoppingBasketIcon aria-hidden />
            Agregar
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-ink-muted">
          Sin existencias por ahora en este almacén.
        </p>
      )}
    </li>
  )
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  // External image URLs break; fall back to the placeholder.
  const [imageFailed, setImageFailed] = useState(false)
  return (
    <article
      aria-label={product.name}
      className="flex flex-col overflow-hidden rounded-2xl border border-panel-border bg-white shadow-[0_1px_0_rgba(91,42,134,0.04),0_8px_24px_-12px_rgba(91,42,134,0.18)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-white">
        {product.imageUrl && !imageFailed ? (
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 size-full object-contain p-3"
          />
        ) : (
          <div
            aria-hidden
            className="grid size-full place-items-center text-6xl font-bold text-ink-heading/25"
          >
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink-heading">
          {product.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <header>
          <h3 className="text-lg leading-snug font-bold tracking-tight text-ink-figure">
            {product.name}
          </h3>
          {product.brand ? (
            <p className="text-sm text-ink-muted">{product.brand}</p>
          ) : null}
        </header>
        <ul className="grid">
          {product.presentations.map((presentation) => (
            <PresentationRow
              key={presentation.id}
              product={product}
              presentation={presentation}
              onAdd={onAdd}
            />
          ))}
        </ul>
      </div>
    </article>
  )
}
