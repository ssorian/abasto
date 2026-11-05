import { WarehouseIcon } from 'lucide-react'

import { Picker } from '#/modules/inventory/components/picker'
import type { StatusFilter } from '#/modules/inventory/lib/stock-metrics'
import type { WarehouseOption } from '#/modules/inventory/types/stock'

type WarehouseSummaryProps = {
  warehouses: ReadonlyArray<WarehouseOption>
  selectedId: string
  onWarehouseChange: (id: string) => void
  counts: { products: number; low: number; soldOut: number }
  onStat: (filter: StatusFilter) => void
  canManage: boolean
}

const pad = (value: number) => String(value).padStart(2, '0')

const statButton =
  'flex items-center gap-2.5 whitespace-nowrap md:flex-col md:items-baseline md:gap-0.5 tablet:flex-row tablet:gap-[7px]'
const statNumber =
  'text-[23px] leading-9 font-[650] tracking-[-0.7px] md:text-[22px] tablet:text-2xl'
const statLabel = 'text-xs text-[#95858a] tablet:text-sm'

/** Warehouse switcher (only warehouses the user can see) plus the headline counters. */
export function WarehouseSummary({
  warehouses,
  selectedId,
  onWarehouseChange,
  counts,
  onStat,
  canManage,
}: WarehouseSummaryProps) {
  return (
    <div className="mb-5 flex min-h-[92px] flex-wrap items-center gap-5 rounded-[12px] border border-[#efe9e3] bg-white p-[17px] md:mb-[23px] md:flex-nowrap md:gap-[15px] tablet:gap-5">
      <div className="flex flex-1 items-center gap-[13px] md:flex-none md:border-r md:border-[#f3eee8] md:pr-[15px] tablet:pr-5">
        <span className="flex size-11 items-center justify-center rounded-[11px] bg-[#f8f3ee] text-[#735b63]">
          <WarehouseIcon size={22} />
        </span>
        <div>
          <span className="ml-[9px] text-xs font-[650] tracking-[1.1px] text-[#9d8d92]">
            ESTÁS CONSULTANDO
          </span>
          <Picker
            label="Almacén"
            value={selectedId}
            onChange={onWarehouseChange}
            options={warehouses.map(({ id, name }) => ({
              value: id,
              label: name,
            }))}
            className="data-[size=default]:h-[27px] min-w-[150px] border-0 bg-transparent px-[9px] text-sm font-[650] text-[#442460] md:min-w-[165px]"
          />
        </div>
      </div>
      <div className="flex w-full items-center justify-around gap-3 border-t border-[#f4eee7] pt-4 md:ml-auto md:w-auto md:justify-start md:border-0 md:p-0 tablet:gap-5 wide:ml-0 wide:gap-[19px]">
        <button
          type="button"
          className={statButton}
          onClick={() => onStat('Todos')}
        >
          <strong className={statNumber}>{pad(counts.products)}</strong>
          <span className={statLabel}>Productos</span>
        </button>
        <span className="h-[19px] w-px bg-[#f0ece7] md:h-6" />
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
        <span className="h-[19px] w-px bg-[#f0ece7] md:h-6" />
        <button
          type="button"
          className={statButton}
          onClick={() => onStat('Sin existencias')}
        >
          <strong className={`${statNumber} text-[#c65956]`}>
            {pad(counts.soldOut)}
          </strong>
          <span className={statLabel}>Sin existencias</span>
        </button>
      </div>
      {!canManage && (
        <span className="ml-auto text-xs whitespace-nowrap text-[#a19096]">
          Solo consulta en este almacén
        </span>
      )}
    </div>
  )
}
