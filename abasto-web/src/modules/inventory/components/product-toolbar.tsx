import { ListFilterIcon, ScanLineIcon, SearchIcon, XIcon } from 'lucide-react'

import { Picker } from '#/modules/inventory/components/picker'
import { sortOptions, statusFilters } from '#/modules/inventory/lib/filters'
import { inventoryCategories } from '#/modules/inventory/lib/catalog'
import { cn } from '#/lib/utils/cn'

import type { ProductSort, StatusFilter } from '#/modules/inventory/lib/filters'

export type ProductView = 'cards' | 'table'

type SearchBoxProps = {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  /** Scan affordance, only shown in the product search. */
  scan?: boolean
}

/** Search field (`.searchbox`). */
export function SearchBox({
  value,
  onChange,
  label,
  placeholder,
  scan = false,
}: SearchBoxProps) {
  return (
    <div className="flex h-[45px] min-w-0 flex-[1_0_100%] items-center gap-2.5 rounded-[9px] border border-[#e0e6ee] bg-white px-[13px] text-[#8190a2] focus-within:border-[#91a8c3] md:h-11 md:flex-1">
      <SearchIcon size={19} className="shrink-0" />
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-full min-w-0 bg-transparent text-xs text-[#344e6e] outline-none placeholder:text-[#8a97a8] wide:text-sm"
      />
      {value && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => onChange('')}
        >
          <XIcon size={16} />
        </button>
      )}
      {scan && (
        <span className="border-l border-[#e4e9f0] pl-[9px] text-[#a2adba]">
          <ScanLineIcon size={17} />
        </span>
      )}
    </div>
  )
}

type ProductToolbarProps = {
  query: string
  onQueryChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  sort: ProductSort
  onSortChange: (value: ProductSort) => void
}

const categoryOptions = [
  { value: 'Todas', label: 'Todas las categorías' },
  ...inventoryCategories,
]

/** Search, category and sort controls of the Productos tab. */
export function ProductToolbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
}: ProductToolbarProps) {
  return (
    <div className="mb-[15px] flex flex-wrap items-center gap-2.5 md:mb-[18px] md:flex-nowrap md:gap-3">
      <SearchBox
        scan
        label="Buscar producto"
        placeholder="Buscar por nombre, SKU o código de barras..."
        value={query}
        onChange={onQueryChange}
      />
      <Picker
        label="Categoría"
        value={category}
        onChange={onCategoryChange}
        options={categoryOptions}
        className="data-[size=default]:h-9 text-xs md:data-[size=default]:h-[43px] md:min-w-[165px] wide:text-sm"
      />
      <div className="ml-auto flex items-center gap-[3px] pl-2 text-[#7c8ca0]">
        <ListFilterIcon size={17} />
        <Picker
          label="Ordenar productos"
          value={sort}
          onChange={(value) => onSortChange(value as ProductSort)}
          options={sortOptions}
          className="data-[size=default]:h-[35px] min-w-[105px] border-0 bg-transparent text-xs wide:text-sm"
        />
      </div>
    </div>
  )
}

type StatusChipsProps = {
  filter: StatusFilter
  onFilterChange: (filter: StatusFilter) => void
  lowCount: number
  view: ProductView
  onViewChange: (view: ProductView) => void
  shown: number
  total: number
}

/** Status chips, view toggle and result counter. */
export function StatusChips({
  filter,
  onFilterChange,
  lowCount,
  view,
  onViewChange,
  shown,
  total,
}: StatusChipsProps) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 max-md:block max-tablet:items-start">
      <div className="flex gap-[7px] wide:gap-[7px] max-md:-mr-5 max-md:overflow-auto max-md:pr-5 max-md:pb-1 md:flex-wrap md:gap-1.5 tablet:gap-2">
        {statusFilters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onFilterChange(item)}
            className={cn(
              'inline-flex h-[33px] items-center gap-1.5 rounded-[6px] border border-[#e2e7ee] bg-white px-[9px] text-xs whitespace-nowrap text-[#798699] hover:border-[#aabacd] tablet:px-[11px]',
              filter === item &&
                'border-[#cdd9e9] bg-[#edf2f9] font-[650] text-[#234c79]',
            )}
          >
            {item}
            {item === 'Stock bajo' && (
              <span className="flex h-[15px] min-w-[15px] items-center justify-center rounded bg-[#fff2cf] px-[3px] text-xs text-[#997127]">
                {lowCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex shrink-0 items-center max-md:mt-3">
        <div
          aria-label="Vista de inventario"
          className="mr-3 flex rounded-[8px] border border-[#dbe4ef] bg-white p-[3px] max-md:mr-0"
        >
          {(['cards', 'table'] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={view === item}
              onClick={() => onViewChange(item)}
              className={cn(
                'rounded-[5px] px-3 py-1.5 text-xs text-[#65758c]',
                view === item && 'bg-[#123566] text-white',
              )}
            >
              {item === 'cards' ? 'Tarjetas' : 'Tabla'}
            </button>
          ))}
        </div>
        <span className="text-xs whitespace-nowrap text-[#98a2b0] max-md:ml-auto">
          {shown} de {total} productos
        </span>
      </div>
    </div>
  )
}
