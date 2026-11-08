import { cn } from '#/lib/utils/cn'
import type { Availability } from '#/modules/store/services/storefront'

/** The availability word is always printed; only the plate around it changes. */
export function AvailabilityTag({
  availability,
  className,
}: {
  availability: Availability
  className?: string
}) {
  if (availability === 'Pocas') {
    return (
      <span className={cn('rb-tag rb-tag--low', className)}>
        <span>Pocas</span>
      </span>
    )
  }
  return (
    <span
      className={cn(
        'rb-tag',
        availability === 'Disponible' ? 'rb-tag--ok' : 'rb-tag--out',
        className,
      )}
    >
      {availability}
    </span>
  )
}
