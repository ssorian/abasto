import { ArrowUpRightIcon, PlusIcon } from 'lucide-react'

import {
  ProductThumb,
  tintFor,
} from '#/modules/inventory/components/product-thumb'
import { StockBadge } from '#/modules/inventory/components/stock-badge'
import { money } from '#/modules/inventory/lib/format'
import {
  available,
  blockedQuantity,
  stockStatus,
} from '#/modules/inventory/lib/stock'
import { cn } from '#/lib/utils/cn'

import type { ProductRow } from '#/modules/inventory/lib/filters'

type ProductCardProps = {
  row: ProductRow
  onOpen: () => void
  onRestock: () => void
}

/** Inventory card of one product in the selected warehouse. */
export function ProductCard({ row, onOpen, onRestock }: ProductCardProps) {
  const { product, stock } = row
  const status = stockStatus(stock)
  const soldOut = status === 'Agotado' || status === 'Sin inventario'

  return (
    <article className="relative overflow-hidden rounded-[12px] border border-[#e2e7ee] bg-white shadow-[0_3px_5px_#14325202] transition-[box-shadow,transform] hover:-translate-y-0.5 hover:border-[#ccd8e5] hover:shadow-[0_7px_22px_#1233570b]">
      <div
        className={cn(
          'relative m-[5px] mb-0 flex h-[180px] items-center justify-center overflow-hidden rounded-[7px] md:m-[7px] md:mb-0 md:h-[175px]',
          tintFor(product.id),
        )}
      >
        <span className="absolute top-2.5 left-[9px] z-[1] text-xs text-[#929cac] md:top-[13px] md:left-[13px]">
          {product.category}
        </span>
        <StockBadge
          dot
          value={status}
          className="absolute top-[9px] right-2 z-[1] max-md:px-[5px] max-md:[&>span]:hidden md:top-[11px] md:right-[11px]"
        />
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Ver inventario de ${product.name}`}
          className="mt-[37px] flex h-[133px] w-full max-w-[85%] items-center justify-center transition-transform hover:scale-105 md:mt-5 md:h-[120px] md:max-w-[75%]"
        >
          <ProductThumb product={product} className="w-auto max-w-[80%]" />
        </button>
        <span className="absolute right-3 bottom-[7px] text-xs tracking-[1px] text-[#a0a9b4] uppercase md:bottom-[9px]">
          {product.unit}
        </span>
      </div>
      <div className="px-5 pt-[18px] md:px-[19px] md:pt-[17px]">
        <span className="text-xs tracking-[0.65px] text-[#9aa5b3]">
          {product.sku}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="mt-1 block text-left text-lg leading-[1.4] font-bold tracking-[-0.25px] text-[#213954] hover:text-[#316295] md:text-[17px]"
        >
          {product.name}
        </button>
        <p className="mt-1 text-sm leading-[1.4] text-[#8a95a4] md:text-[13px]">
          {product.description}
        </p>
        <div className="my-[18px] flex items-center justify-between gap-1.5 md:gap-[15px] md:mt-[19px] md:mb-[17px]">
          <div>
            <span className="text-sm text-[#8b96a5]">Disponible</span>
            <strong
              className={cn(
                'mt-1.5 flex items-baseline gap-[7px] text-[30px] leading-[1.15] font-[650] tracking-[-0.9px] md:mt-[3px]',
                available(stock) === 0 && 'text-[#b1bac6]',
              )}
            >
              {available(stock)}
              <small className="ml-[5px] text-xs leading-[1.15] font-normal tracking-normal text-[#8793a3] md:ml-0">
                {product.unit}
              </small>
            </strong>
          </div>
          <div className="flex min-w-[110px] flex-col gap-1 border-l border-[#e4eaf1] pt-1 pl-5 md:min-w-[90px] md:border-[#e9edf2] md:pl-2.5 wide:min-w-[102px] wide:pl-3.5">
            <Figure label="Reservado" value={stock.reserved} />
            <Figure label="Bloqueado" value={blockedQuantity(stock)} />
            <Figure label="Físico" value={stock.physical} />
          </div>
        </div>
        <div className="flex min-h-[47px] items-center justify-between border-t border-[#edf0f4]">
          <span className="flex items-center gap-2.5 text-xs text-[#939dac] md:gap-[7px]">
            Último costo{' '}
            <b className="text-sm font-semibold text-[#586c84]">
              {stock.received ? money(stock.last) : '—'}
            </b>
          </span>
          <button
            type="button"
            aria-label={`Ver detalle de ${product.name}`}
            onClick={onOpen}
            className="grid size-[30px] place-items-center rounded-[7px] bg-[#f0f4f9] text-[#476b93] hover:bg-[#dee9f6] md:size-[29px]"
          >
            <ArrowUpRightIcon size={19} />
          </button>
        </div>
      </div>
      {soldOut && (
        <button
          type="button"
          onClick={onRestock}
          className="flex min-h-[35px] w-full items-center justify-center gap-[5px] border-t border-[#f4ead0] bg-[#fcf8ec] text-[13px] font-semibold text-[#987222] md:min-h-[30px] md:text-xs"
        >
          <PlusIcon size={15} />
          {stock.received ? 'Registrar entrada' : 'Registrar primera entrada'}
        </button>
      )}
    </article>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-3.5 py-1 text-sm text-[#8793a2]">
      <span>{label}</span>
      <strong className="text-sm font-[550] text-[#526680]">{value}</strong>
    </div>
  )
}
