import { Link } from '@tanstack/react-router'
import { ArrowRight, Warehouse } from 'lucide-react'

import type { WarehouseSummary } from '#/modules/warehouses/lib/warehouse-summary'

export function WarehouseCard({ warehouse }: { warehouse: WarehouseSummary }) {
  return (
    <article className="flex overflow-hidden rounded-[13px] border border-[#e0e6ee] bg-white tablet:block">
      <div className="flex w-[95px] shrink-0 flex-col items-center justify-center gap-[5px] bg-[#eaf0f7] p-5 text-[#617e9e] md:w-[150px] md:p-[25px] tablet:h-[146px] tablet:w-auto tablet:flex-row tablet:justify-between tablet:gap-0 tablet:p-[35px]">
        <Warehouse className="w-[37px] md:w-auto" size={47} aria-hidden />
        <span className="text-[44px] font-[750] tracking-[-4px] text-[#d1dce9] md:text-[62px]">
          {warehouse.number}
        </span>
      </div>

      <div className="flex-1 px-4 py-5 md:p-5 wide:p-6">
        <span className="text-xs leading-normal font-bold tracking-[1.5px] text-ink-eyebrow">
          {warehouse.city}
        </span>
        <h2 className="mt-2 text-xl font-[650] tracking-[-0.5px] md:text-[21px] tablet:text-[23px]">
          Almacén {warehouse.name}
        </h2>
        <p className="mt-2 text-xs leading-[1.6] text-[#8593a4] md:text-sm">
          {warehouse.description}
        </p>

        <div className="my-[15px] border-t border-[#e8edf3] pt-3.5 tablet:my-[22px]">
          <span className="flex justify-between gap-[15px] py-2 text-xs text-[#8b98a9] md:text-sm">
            Productos con existencias
            <strong className="text-[#385875]">
              {warehouse.productsInStock}
            </strong>
          </span>
          <span className="flex justify-between gap-[15px] py-2 text-xs text-[#8b98a9] md:text-sm">
            Productos por reponer
            <strong className="text-[#385875]">
              {warehouse.productsToRestock}
            </strong>
          </span>
        </div>

        <Link
          to="/inventario"
          search={{ almacen: warehouse.name }}
          className="inline-flex min-h-11 w-full items-center justify-center gap-[9px] rounded-[9px] border border-[#dce3ed] bg-white px-[17px] py-2.5 text-sm font-[650] whitespace-nowrap text-[#31465e] hover:bg-[#f1f5fa]"
        >
          Ver inventario
          <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  )
}
