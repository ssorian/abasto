import { ChevronDownIcon } from 'lucide-react'

import type { StoreWarehouse } from '#/modules/store/services/storefront'

type WarehousePickerProps = {
  warehouses: Array<StoreWarehouse>
  value: string
  onChange: (warehouseId: string) => void
}

/** Dock plate: names the pickup warehouse. A native select stays the best phone picker. */
export function WarehousePicker({
  warehouses,
  value,
  onChange,
}: WarehousePickerProps) {
  return (
    <div className="rb-plate grid gap-1.5 p-2.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-x-5">
      <div className="grid gap-1.5">
        <label htmlFor="warehouse" className="rb-label">
          Recoges tu pedido en
        </label>
        <div className="relative">
          <select
            id="warehouse"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="rb-stencil h-12 w-full appearance-none rounded-[2px] border-2 border-rb-graphite bg-rb-label pr-11 pl-3 text-[24px] tracking-[0.04em] sm:min-w-72"
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            aria-hidden
            strokeWidth={3}
            className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2"
          />
        </div>
      </div>
      <p className="text-[13px] leading-snug font-medium sm:text-[14px]">
        Precios, existencias y hoja de surtido propios de este almacén.
      </p>
    </div>
  )
}
