import { LayoutGridIcon, TableIcon } from 'lucide-react'

import { cn } from '#/lib/utils/cn'

import type { CatalogView } from '#/modules/catalog/lib/catalog-view'

const options = [
  { value: 'table', label: 'Tabla', Icon: TableIcon },
  { value: 'cards', label: 'Tarjetas', Icon: LayoutGridIcon },
] as const

type CatalogViewToggleProps = {
  value: CatalogView
  onChange: (view: CatalogView) => void
}

/** Segmented buttons: the pressed one is the active view. */
export function CatalogViewToggle({ value, onChange }: CatalogViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Vista del catálogo"
      className="inline-flex h-[45px] shrink-0 rounded-[9px] border border-[#eee7e0] bg-white p-1 md:h-11"
    >
      {options.map(({ value: option, label, Icon }) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[6px] px-3 text-xs font-semibold text-[#907e84] hover:text-[#53346e] md:text-sm',
            value === option && 'bg-[#f3ebf8] text-[#4d2b6a]',
          )}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  )
}
