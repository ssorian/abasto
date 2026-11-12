import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, CheckIcon, TagIcon } from 'lucide-react'

import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { ProductImage } from '#/components/product-image'
import { presentationLabel } from '#/modules/catalog/lib/catalog-presentations'

import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
import type { ReactNode } from 'react'

type CatalogCardProps = {
  product: CatalogProduct
  supplierName?: string
  /** Owner-only write actions; staff only browse. */
  canManage: boolean
  /** Prices of the selected warehouse; omitted when the actor sees none. */
  prices?: ReactNode
  /** Opens the Prices dialog; absent when the product has no prices to show. */
  onPrices?: () => void
  onEdit: () => void
}

export function CatalogCard({
  product,
  supplierName,
  canManage,
  prices,
  onPrices,
  onEdit,
}: CatalogCardProps) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-[#eee8e2] bg-white shadow-[0_3px_5px_#35145202] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#ddd4d7] hover:shadow-[0_7px_22px_#3712570b]">
      <div className="relative m-[5px_5px_0] flex h-[162px] items-center justify-center overflow-hidden rounded-[7px] bg-[#faf9f7] md:m-[7px_7px_0] md:h-[205px]">
        <ProductImage
          src={product.imageUrl}
          name={product.name}
          className="size-full object-contain p-4 mix-blend-multiply"
        />
        <span className="absolute top-[9px] right-[9px] flex items-center gap-1 rounded-[5px] bg-white px-1.5 py-1 text-xs text-[#62348b] md:top-3 md:right-3">
          <CheckIcon size={12} />
          {product.published ? 'Publicado' : 'Pausado'}
        </span>
      </div>
      <div className="px-[15px] pt-[15px] pb-[15px] md:pb-[22px] wide:px-[19px] wide:pt-[17px]">
        <span className="block text-xs leading-6 tracking-[0.65px] text-[#ae9fa4]">
          {[product.brand, product.sku].filter(Boolean).join(' · ')}
        </span>
        <h3 className="mt-1.5 text-base leading-normal font-[650] md:text-[17px]">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-[1.4] text-[#9f8f94] md:text-[13px]">
          {product.description}
        </p>
        <div className="my-5 block border-b border-[#f4f1ed] pb-[18px] text-xs text-[#a29096] md:text-sm">
          <span>Presentación principal</span>
          <strong className="mt-[7px] block text-base leading-normal font-bold text-[#4d2b6a]">
            {presentationLabel(product)}
          </strong>
          {supplierName ? (
            <span className="mt-1 block text-xs">
              Proveedor: {supplierName}
            </span>
          ) : null}
        </div>
        {prices}
        <p className="mt-1 text-[11px] leading-[1.4] text-[#9f8f94]">
          El inventario se lleva en {product.unit}.
        </p>
        {onPrices || canManage ? (
          <div className="my-3.5 flex flex-wrap gap-[9px]">
            {onPrices ? (
              <CatalogButton className="flex-1 px-3" onClick={onPrices}>
                <TagIcon className="size-4" />
                Precios
              </CatalogButton>
            ) : null}
            {canManage ? (
              <CatalogButton className="flex-1 px-3" onClick={onEdit}>
                Editar
              </CatalogButton>
            ) : null}
          </div>
        ) : null}
        <Link
          to="/inventario"
          search={{ q: product.name }}
          className="mt-3 inline-flex min-h-9 items-center gap-[7px] text-sm font-[650] text-ink-link hover:underline md:min-h-0"
        >
          Consultar inventario <ArrowRightIcon size={15} />
        </Link>
      </div>
    </article>
  )
}
