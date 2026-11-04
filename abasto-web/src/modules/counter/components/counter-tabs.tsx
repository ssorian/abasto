import { cn } from '#/lib/utils/cn'

export type CounterTab = 'Venta' | 'Caja'

const tabs: Array<{ value: CounterTab; label: string }> = [
  { value: 'Venta', label: 'Venta en mostrador' },
  { value: 'Caja', label: 'Caja y turnos' },
]

/** Pill-style switch between the sale composer and the cash panel. */
export function CounterTabs({
  value,
  onChange,
}: {
  value: CounterTab
  onChange: (tab: CounterTab) => void
}) {
  return (
    <div
      role="group"
      className="mb-[22px] flex gap-[5px] rounded-[10px] bg-[#eaf0f7] p-[5px] md:inline-flex"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-pressed={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-[7px] px-2 py-2.5 text-xs text-[#5c7694] max-md:flex-1 md:px-[17px] md:text-[13px]',
            value === tab.value &&
              'bg-white font-[650] text-ink-figure shadow-[0_1px_5px_#163a6512]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
