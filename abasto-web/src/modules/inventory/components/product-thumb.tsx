import { cn } from '#/lib/utils/cn'

import type { InventoryProduct } from '#/modules/inventory/types/inventory'

/** Product photo that blends into its tinted background (`.product-image`). */
export function ProductThumb({
  product,
  className,
}: {
  product: InventoryProduct
  className?: string
}) {
  return (
    <img
      src={product.image}
      alt={product.name}
      loading="lazy"
      className={cn(
        'block h-full max-w-full object-contain mix-blend-multiply',
        className,
      )}
    />
  )
}

/** Tint behind each product photo (`.visual-<id>`). */
export const productTints: Record<string, string> = {
  coca: 'bg-[#fbf6f5]',
  nutrioli: 'bg-[#faf9f2]',
  sabritas: 'bg-[#fbf8f1]',
  lala: 'bg-[#f7f5f5]',
  costena: 'bg-[#f7f8f3]',
  maseca: 'bg-[#f8f8f0]',
  ciel: 'bg-[#f1f7fa]',
  moderna: 'bg-[#f7f4ee]',
}

export const tintFor = (productId: string) =>
  productTints[productId] ?? 'bg-[#f7f8fa]'
