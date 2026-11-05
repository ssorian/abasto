import { SearchIcon } from 'lucide-react'

import { SelectInput } from '#/modules/catalog/forms/form-field'
import type { PriceFilters } from '#/modules/pricing/lib/price-table'

type PriceToolbarProps = {
  warehouses: Array<{ id: string; name: string }>
  warehouseId: string
  onWarehouseChange: (id: string) => void
  filters: PriceFilters
  onFiltersChange: (filters: PriceFilters) => void
  suppliers: Array<{ id: string; name: string }>
  categories: Array<string>
}

export function PriceToolbar({
  warehouses,
  warehouseId,
  onWarehouseChange,
  filters,
  onFiltersChange,
  suppliers,
  categories,
}: PriceToolbarProps) {
  const patch = (change: Partial<PriceFilters>) =>
    onFiltersChange({ ...filters, ...change })
  return (
    <div className="mb-[18px] flex flex-wrap items-center gap-2.5">
      <SelectInput
        aria-label="Almacén"
        className="w-auto min-w-[170px]"
        value={warehouseId}
        onChange={(event) => onWarehouseChange(event.target.value)}
      >
        {warehouses.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </SelectInput>
      <div className="flex h-11 min-w-[220px] flex-1 items-center gap-2.5 rounded-[9px] border border-[#e0e6ee] bg-white px-[13px] text-[#8190a2] focus-within:border-[#91a8c3]">
        <SearchIcon size={18} className="shrink-0" />
        <input
          aria-label="Buscar por producto o SKU"
          placeholder="Buscar por producto o SKU..."
          value={filters.query}
          onChange={(event) => patch({ query: event.target.value })}
          className="h-full w-full min-w-0 border-0 bg-transparent text-sm text-[#344e6e] outline-none placeholder:text-[#8a97a8]"
        />
      </div>
      <SelectInput
        aria-label="Proveedor"
        className="w-auto"
        value={filters.supplierId}
        onChange={(event) => patch({ supplierId: event.target.value })}
      >
        <option value="">Todos los proveedores</option>
        {suppliers.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </SelectInput>
      <SelectInput
        aria-label="Categoría"
        className="w-auto"
        value={filters.category}
        onChange={(event) => patch({ category: event.target.value })}
      >
        <option value="">Todas las categorías</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </SelectInput>
    </div>
  )
}
