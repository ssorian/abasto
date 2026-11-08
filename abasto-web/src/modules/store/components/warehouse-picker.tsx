import { MapPinIcon } from 'lucide-react'

import type { StoreWarehouse } from '#/modules/store/services/storefront'

type WarehousePickerProps = {
  warehouses: Array<StoreWarehouse>
  value: string
  onChange: (warehouseId: string) => void
}

/** Native select: best picker on phones, and fully accessible. */
export function WarehousePicker({
  warehouses,
  value,
  onChange,
}: WarehousePickerProps) {
  return (
    <div className="rounded-2xl bg-ink-heading p-4 text-white">
      <label
        htmlFor="warehouse"
        className="text-xs font-bold tracking-[1.5px] text-white/75"
      >
        RECOGES TU PEDIDO EN
      </label>
      <div className="relative mt-2">
        <MapPinIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-heading"
        />
        <select
          id="warehouse"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border-0 bg-white pr-3 pl-9 text-base font-semibold text-ink-heading"
        >
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-[13px] text-white/80">
        Precios y existencias son de este almacén. Cada almacén tiene su propio
        carrito.
      </p>
    </div>
  )
}
