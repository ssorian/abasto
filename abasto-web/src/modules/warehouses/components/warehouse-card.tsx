import { Warehouse } from 'lucide-react'

import type { Warehouse as WarehouseRecord } from '#/modules/warehouses/services/warehouses'

export function WarehouseCard({
  warehouse,
  number,
}: {
  warehouse: WarehouseRecord
  /** Two-digit position shown as the card art number, e.g. "01". */
  number: string
}) {
  return (
    <article className="flex overflow-hidden rounded-[13px] border border-[#e0e6ee] bg-white tablet:block">
      <div className="flex w-[95px] shrink-0 flex-col items-center justify-center gap-[5px] bg-[#eaf0f7] p-5 text-[#617e9e] md:w-[150px] md:p-[25px] tablet:h-[146px] tablet:w-auto tablet:flex-row tablet:justify-between tablet:gap-0 tablet:p-[35px]">
        <Warehouse className="w-[37px] md:w-auto" size={47} aria-hidden />
        <span className="text-[44px] font-[750] tracking-[-4px] text-[#d1dce9] md:text-[62px]">
          {number}
        </span>
      </div>

      <div className="flex-1 px-4 py-5 md:p-5 wide:p-6">
        <span className="text-xs leading-normal font-bold tracking-[1.5px] text-ink-eyebrow">
          ALMACÉN
        </span>
        <h2 className="mt-2 text-xl font-[650] tracking-[-0.5px] md:text-[21px] tablet:text-[23px]">
          {warehouse.name}
        </h2>
      </div>
    </article>
  )
}
