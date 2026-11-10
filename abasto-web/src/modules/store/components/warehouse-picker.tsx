import { ChevronDownIcon } from 'lucide-react'

import type { StoreWarehouse } from '#/modules/store/services/storefront'

type WarehousePickerProps = {
  warehouses: Array<StoreWarehouse>
  value: string
  onChange: (warehouseId: string) => void
}

/** Names the pickup warehouse. A native select stays the best phone picker. */
export function WarehousePicker({
  warehouses,
  value,
  onChange,
}: WarehousePickerProps) {
  return (
    <div className="st-plate grid gap-1.5 p-2.5 sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:items-center sm:gap-x-4 sm:px-3 sm:py-2">
      <label htmlFor="warehouse" className="st-card sm:whitespace-nowrap">
        Recoges tu pedido en
      </label>
      <div className="relative">
        <select
          id="warehouse"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full appearance-none rounded-[10px] border border-st-control bg-st-card pr-11 pl-3 text-[18px] font-semibold text-st-ink sm:h-11 sm:min-w-72"
        >
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2"
        />
      </div>
      <p className="text-[13px] leading-snug text-st-ink-soft sm:text-[14px]">
        Precios, existencias y hoja de surtido propios de este almacén.
      </p>
    </div>
  )
}
