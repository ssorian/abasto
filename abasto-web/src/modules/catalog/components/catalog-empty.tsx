import { PackageIcon } from 'lucide-react'

/** Shown when the search matches no product. */
export function CatalogEmpty() {
  return (
    <div className="mt-5 flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-[#e6dfeb] bg-white px-6 py-[60px] text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-[#f9f4ee] text-[#90717b]">
        <PackageIcon size={26} />
      </div>
      <h3 className="text-lg font-semibold text-[#502973]">Sin resultados</h3>
      <p className="text-sm text-[#91757e]">Prueba con otro producto.</p>
    </div>
  )
}
