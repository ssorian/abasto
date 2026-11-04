import { LayoutGridIcon } from 'lucide-react'

export function CatalogBanner() {
  return (
    <div className="mb-[25px] flex items-start gap-[13px] rounded-[9px] border border-[#d9e5f2] bg-[#eaf1fa] px-[18px] py-[15px] text-[13px] leading-[1.7] text-[#54759a] md:items-center md:text-sm">
      <LayoutGridIcon size={20} className="mt-[3px] shrink-0 md:mt-0" />
      <p className="flex-1">
        La información comercial se administra aquí. Las existencias y los
        costos de entrada se consultan en Inventario.
      </p>
    </div>
  )
}
