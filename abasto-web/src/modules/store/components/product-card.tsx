import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { formatCents } from '#/modules/pricing/lib/money'
import { AvailabilityTag } from '#/modules/store/components/availability-tag'
import { QuantityStepper } from '#/modules/store/components/quantity-stepper'
import { quantityIn } from '#/modules/store/lib/pick-list'
import { canAddToCart } from '#/modules/store/lib/store-labels'
import type { CartLine } from '#/modules/store/lib/cart'
import type {
  StorePresentation,
  StoreProduct,
} from '#/modules/store/services/storefront'

type ProductCardProps = {
  product: StoreProduct
  lines: Array<CartLine>
  /** Sets the cart quantity of a presentation; zero removes the line. */
  onSet: (presentationId: string, quantity: number) => void
}

/** Photo on a label mat; external URLs break, so it falls back to a monogram. */
export function ProductMat({ product }: { product: StoreProduct }) {
  // Remembered per URL, so a corrected photo gets a fresh try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (product.imageUrl && failedUrl !== product.imageUrl) {
    return (
      <span className="st-mat">
        <img
          ref={(img) => {
            // The server-rendered image can fail before React attaches onError.
            if (img?.complete && img.naturalWidth === 0) {
              setFailedUrl(product.imageUrl)
            }
          }}
          src={product.imageUrl}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(product.imageUrl)}
        />
      </span>
    )
  }
  return (
    <span className="st-mat st-mat--empty" aria-hidden>
      {product.name.charAt(0).toUpperCase()}
    </span>
  )
}

function PresentationStrip({
  product,
  presentation,
  quantity,
  onSet,
}: {
  product: StoreProduct
  presentation: StorePresentation
  quantity: number
  onSet: ProductCardProps['onSet']
}) {
  const available = canAddToCart(presentation.availability)
  const label = `${product.name}, ${presentation.name}`
  return (
    <li
      className="st-strip"
      data-out={available ? undefined : ''}
      data-picked={quantity > 0 ? '' : undefined}
    >
      <div className="grid min-w-0 gap-1">
        <span className="st-strike truncate text-[15px] leading-tight font-semibold">
          {presentation.name}
        </span>
        <AvailabilityTag
          availability={presentation.availability}
          className="justify-self-start"
        />
      </div>
      <span className="st-num st-strike text-right text-[17px] leading-none">
        {formatCents(presentation.priceCents)}
      </span>
      <div className="flex min-h-[52px] w-[140px] items-center justify-end">
        {!available ? null : quantity === 0 ? (
          <button
            type="button"
            className="st-add"
            aria-label={`Agregar a la hoja: ${label}`}
            onClick={() => onSet(presentation.id, 1)}
          >
            <PlusIcon className="size-6" strokeWidth={2.25} aria-hidden />
          </button>
        ) : (
          <QuantityStepper
            value={quantity}
            min={0}
            label={label}
            onChange={(next) => onSet(presentation.id, next)}
          />
        )}
      </div>
    </li>
  )
}

/** One product as a rack label: header with the photo mat, one strip per presentation. */
export function ProductCard({ product, lines, onSet }: ProductCardProps) {
  return (
    <article aria-label={product.name} className="st-block">
      <header className="flex items-center gap-3 p-2.5">
        <ProductMat product={product} />
        <div className="min-w-0">
          <h3 className="st-stencil line-clamp-2 text-[16px] leading-snug">
            {product.name}
          </h3>
          <p className="truncate text-[13px] text-st-muted">
            {[product.brand, product.category].filter(Boolean).join(' · ')}
          </p>
        </div>
      </header>
      <ul>
        {product.presentations.map((presentation) => (
          <PresentationStrip
            key={presentation.id}
            product={product}
            presentation={presentation}
            quantity={quantityIn(lines, presentation.id)}
            onSet={onSet}
          />
        ))}
      </ul>
    </article>
  )
}
