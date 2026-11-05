import { cn } from '#/lib/utils/cn'

type PillTabsProps<TValue extends string> = {
  value: TValue
  options: Array<{ value: TValue; label: string }>
  onChange: (value: TValue) => void
  className?: string
}

/** Pill-style switch between report views; fills the row on small screens. */
export function PillTabs<TValue extends string>({
  value,
  options,
  onChange,
  className,
}: PillTabsProps<TValue>) {
  return (
    <div
      role="group"
      className={cn(
        'mb-[22px] flex gap-[5px] rounded-[10px] bg-[#f7f1ea] p-[5px] md:inline-flex',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-[7px] px-2 py-2.5 text-xs text-[#866a73] max-md:flex-1 md:px-[17px] md:text-[13px]',
            value === option.value &&
              'bg-white font-[650] text-ink-figure shadow-[0_1px_5px_#40166512]',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
