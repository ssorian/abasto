import { cn } from '#/lib/utils/cn'

export type CatalogStatus = 'active' | 'archived'

type CatalogStatusFilterProps = {
  value: CatalogStatus
  archivedCount: number
  onChange: (status: CatalogStatus) => void
}

/** Segmented buttons: the catalog of active products or the archived ones. */
export function CatalogStatusFilter({
  value,
  archivedCount,
  onChange,
}: CatalogStatusFilterProps) {
  const options = [
    { value: 'active', label: 'Activos' },
    { value: 'archived', label: `Archivados (${archivedCount})` },
  ] as const
  return (
    <div
      role="group"
      aria-label="Estado del producto"
      className="inline-flex h-[45px] shrink-0 rounded-[9px] border border-[#eee7e0] bg-white p-1 md:h-11"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex items-center rounded-[6px] px-3 text-xs font-semibold text-[#907e84] hover:text-[#53346e] md:text-sm',
            value === option.value && 'bg-[#f3ebf8] text-[#4d2b6a]',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
