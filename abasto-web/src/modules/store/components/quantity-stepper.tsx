import { MinusIcon, PlusIcon } from 'lucide-react'

import { MAX_LINE_QUANTITY } from '#/modules/store/lib/cart'
import { cn } from '#/lib/utils/cn'

type QuantityStepperProps = {
  value: number
  onChange: (value: number) => void
  label: string
  /** Lowest value; the cart uses 0 so the minus button can remove a line. */
  min?: number
  className?: string
}

const stepButton =
  'grid size-11 place-items-center text-ink-heading transition-colors hover:bg-accent disabled:text-ink-faint disabled:hover:bg-transparent'

/** Touch-sized quantity control with a typed input in the middle. */
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
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex items-center overflow-hidden rounded-xl border border-input bg-white',
        className,
      )}
    >
      <button
        type="button"
        className={stepButton}
        aria-label={`Quitar una unidad: ${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <MinusIcon className="size-4" aria-hidden />
      </button>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={`Cantidad: ${label}`}
        value={value}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '')
          if (digits) onChange(clamp(Number(digits)))
        }}
        className="h-11 w-12 border-x border-input bg-transparent text-center text-base font-semibold text-ink-figure tabular-nums outline-none focus-visible:bg-accent"
      />
      <button
        type="button"
        className={stepButton}
        aria-label={`Agregar una unidad: ${label}`}
        disabled={value >= MAX_LINE_QUANTITY}
        onClick={() => onChange(clamp(value + 1))}
      >
        <PlusIcon className="size-4" aria-hidden />
      </button>
    </div>
  )
}
