import { MinusIcon, PlusIcon } from 'lucide-react'

import { cn } from '#/lib/utils/cn'
import { MAX_LINE_QUANTITY } from '#/modules/store/lib/cart'

type QuantityStepperProps = {
  value: number
  onChange: (value: number) => void
  label: string
  /** Lowest value; the pick list uses 0 so the minus button can remove a line. */
  min?: number
  className?: string
}

const CELLS = 12

/**
 * Pick-face stepper: minus, typed quantity, plus, and under it the quantity
 * drawn as a bar of whole cells (the twelfth cell turns signal past twelve).
 */
export function QuantityStepper({
  value,
  onChange,
  label,
  min = 1,
  className,
}: QuantityStepperProps) {
  const clamp = (next: number) =>
    Math.min(MAX_LINE_QUANTITY, Math.max(min, Math.trunc(next)))
  return (
    <div className={cn('w-[140px]', className)}>
      <div
        role="group"
        aria-label={label}
        className={cn('rb-stepper', value > min && 'rb-stepper--set')}
      >
        <button
          type="button"
          aria-label={`Quitar una unidad: ${label}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1))}
        >
          <MinusIcon className="size-5" strokeWidth={2.5} aria-hidden />
        </button>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`Cantidad: ${label}`}
          value={value}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '')
            if (digits) onChange(clamp(Number(digits)))
          }}
        />
        <button
          type="button"
          aria-label={`Agregar una unidad: ${label}`}
          disabled={value >= MAX_LINE_QUANTITY}
          onClick={() => onChange(clamp(value + 1))}
        >
          <PlusIcon className="size-5" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
      <div
        className="rb-cells"
        aria-hidden
        data-over={value > CELLS ? '' : undefined}
      >
        {Array.from({ length: CELLS }, (_, cell) => (
          <i key={cell} data-on={cell < value ? '' : undefined} />
        ))}
      </div>
    </div>
  )
}
