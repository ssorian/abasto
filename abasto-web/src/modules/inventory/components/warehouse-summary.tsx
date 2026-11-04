import { MapPinIcon, WarehouseIcon } from 'lucide-react'

import { Picker } from '#/modules/inventory/components/picker'
import { warehouseNames } from '#/shared/demo/types'

import type { WarehouseScope } from '#/modules/inventory/types/inventory'

const locations: Record<WarehouseScope, string> = {
  Todos: '3 almacenes',
  Centro: 'Centro · Tejupilco',
  Norte: 'Zona Norte · Tejupilco',
  Sur: 'Zona Sur · Tejupilco',
}

const warehouseOptions = [
  { value: 'Todos', label: 'Todos los almacenes' },
  ...warehouseNames.map((name) => ({ value: name, label: `Almacén ${name}` })),
]

type Counts = { products: number; low: number; soldOut: number }

type WarehouseSummaryProps = {
  warehouse: WarehouseScope
  onWarehouseChange: (warehouse: WarehouseScope) => void
  counts: Counts
  onStat: (filter: 'Todos' | 'Stock bajo' | 'Agotado') => void
}

const pad = (value: number) => String(value).padStart(2, '0')

const statButton =
  'flex items-center gap-2.5 whitespace-nowrap md:flex-col md:items-baseline md:gap-0.5 tablet:flex-row tablet:gap-[7px]'
const statNumber =
  'text-[23px] leading-9 font-[650] tracking-[-0.7px] md:text-[22px] tablet:text-2xl'
const statLabel = 'text-xs text-[#7f8b9b] tablet:text-sm'

/** Warehouse switcher plus the three headline counters. */
export function WarehouseSummary({
  warehouse,
  onWarehouseChange,
  counts,
  onStat,
}: WarehouseSummaryProps) {
  return (
    <div className="mb-5 flex min-h-[92px] flex-wrap items-center gap-5 rounded-[12px] border border-[#e3e8ef] bg-white p-[17px] md:mb-[23px] md:flex-nowrap md:gap-[15px] tablet:gap-5">
      <div className="flex flex-1 items-center gap-[13px] md:flex-none md:border-r md:border-[#e8edf3] md:pr-[15px] tablet:pr-5">
        <span className="flex size-11 items-center justify-center rounded-[11px] bg-[#edf2f9] text-[#476887]">
          <WarehouseIcon size={22} />
        </span>
        <div>
          <span className="ml-[9px] text-xs font-[650] tracking-[1.1px] text-[#8793a3]">
            ESTÁS CONSULTANDO
          </span>
          <Picker
            label="Almacén"
            value={warehouse}
            onChange={(value) => onWarehouseChange(value as WarehouseScope)}
            options={warehouseOptions}
            className="data-[size=default]:h-[27px] min-w-[150px] border-0 bg-transparent px-[9px] text-sm font-[650] text-[#243e60] md:min-w-[165px]"
          />
        </div>
      </div>
      <div className="flex w-full items-center justify-around gap-3 border-t border-[#e7edf4] pt-4 md:ml-auto md:w-auto md:justify-start md:border-0 md:p-0 tablet:gap-5 wide:ml-0 wide:gap-[19px]">
        <button
          type="button"
          className={statButton}
          onClick={() => onStat('Todos')}
        >
          <strong className={statNumber}>{pad(counts.products)}</strong>
          <span className={statLabel}>Productos</span>
        </button>
        <span className="h-[19px] w-px bg-[#e7ebf0] md:h-6" />
        <button
          type="button"
          className={statButton}
          onClick={() => onStat('Stock bajo')}
        >
          <strong className={`${statNumber} text-[#ba801d]`}>
            {pad(counts.low)}
          </strong>
          <span className={statLabel}>Stock bajo</span>
        </button>
        <span className="h-[19px] w-px bg-[#e7ebf0] md:h-6" />
        <button
          type="button"
          className={statButton}
          onClick={() => onStat('Agotado')}
        >
          <strong className={`${statNumber} text-[#c65956]`}>
            {pad(counts.soldOut)}
          </strong>
          <span className={statLabel}>Agotados</span>
        </button>
      </div>
      <div className="ml-auto hidden items-center gap-1.5 text-xs whitespace-nowrap text-[#8a96a7] wide:flex">
        <MapPinIcon size={15} />
        {locations[warehouse]}
      </div>
    </div>
  )
}
