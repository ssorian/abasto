import { Plus, ScanLine } from 'lucide-react'

import {
  availableUnits,
  defaultPresentation,
  lotsFor,
} from '#/modules/counter/lib/stock'
import { presentationBreakdown } from '#/shared/demo/selectors'
import { ActionButton } from '#/modules/counter/components/action-button'
import { SectionHelp } from '#/modules/counter/components/info-banner'

import type { OrderComposer } from '#/modules/counter/hooks/use-order-composer'
import type { CounterState } from '#/modules/counter/types/counter'

/** Barcode/SKU search box plus the quick-add product cards. */
export function ProductSearch({
  composer,
  state,
}: {
  composer: OrderComposer
  state: CounterState
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#dce2da] bg-white px-3 py-[9px] md:flex-nowrap">
        <ScanLine size={19} className="text-[#6b796f]" />
        <input
          ref={composer.scanRef}
          aria-label="Escanear o buscar producto"
          placeholder="Código de barras, etiqueta interna + Enter o SKU…"
          value={composer.query}
          onChange={(event) => composer.setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              composer.scanCode()
            }
          }}
          className="w-[70%] min-w-0 flex-1 py-2 text-sm outline-none"
        />
        <ActionButton
          className="max-md:w-full"
          onClick={composer.scanCode}
          disabled={!composer.query.trim()}
        >
          Agregar código
        </ActionButton>
      </div>

      <div className="grid grid-cols-2 gap-[9px] metrics:grid-cols-4">
        {composer.matches.slice(0, 8).map((product) => {
          const available = availableUnits(
            lotsFor(state, product.id, composer.warehouse),
          )
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => composer.add(product.id)}
              disabled={available <= 0}
              className="flex items-center gap-[9px] rounded-[10px] border border-[#e4e8e1] bg-white p-2 text-left transition-colors hover:border-[#638567] disabled:cursor-not-allowed disabled:opacity-45 md:p-[11px]"
            >
              <img
                src={product.image}
                alt=""
                className="h-[38px] w-[27px] object-contain md:h-12 md:w-[34px]"
              />
              <span className="min-w-0 flex-1">
                <strong className="block text-[11px] leading-[1.35] md:text-xs">
                  {product.name}
                </strong>
                <small className="block text-[10px] leading-[1.65] text-[#7b857d]">
                  {presentationBreakdown(product, available)} disponibles
                </small>
                <small className="block text-[10px] leading-[1.65] text-[#7b857d]">
                  {defaultPresentation(product).barcode ||
                    'Sin código asignado'}
                </small>
              </span>
              <Plus size={16} className="max-md:hidden" />
            </button>
          )
        })}
        {!composer.matches.length && (
          <SectionHelp>Sin coincidencias.</SectionHelp>
        )}
      </div>
    </>
  )
}
