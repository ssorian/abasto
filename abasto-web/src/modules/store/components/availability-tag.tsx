import { cn } from '#/lib/utils/cn'
import type { Availability } from '#/modules/store/services/storefront'

/** The availability word is always printed; only the pill around it changes. */
export function AvailabilityTag({
  availability,
  className,
}: {
  availability: Availability
  className?: string
}) {
  return (
    <span
      className={cn(
        'st-tag',
        availability === 'Disponible' && 'st-tag--ok',
        availability === 'Pocas' && 'st-tag--low',
        availability !== 'Disponible' &&
          availability !== 'Pocas' &&
          'st-tag--out',
        className,
      )}
    >
      {availability}
    </span>
  )
}
