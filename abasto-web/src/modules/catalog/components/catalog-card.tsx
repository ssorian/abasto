import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  CheckIcon,
  PackageIcon,
  ScanLineIcon,
} from 'lucide-react'

import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { formatPesos } from '#/modules/catalog/lib/catalog-money'
import {
  catalogPriceCents,
  pricingLabel,
} from '#/modules/catalog/lib/catalog-presentations'

import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

/** Tint behind each product photo, from the reference. */
const visualTints: Record<string, string> = {
  coca: '#fbf6f5',
  nutrioli: '#faf9f2',
  sabritas: '#fbf8f1',
  lala: '#f7f5f5',
  costena: '#f7f8f3',
  maseca: '#f8f8f0',
  ciel: '#f1f7fa',
  moderna: '#f7f4ee',
}

type CatalogCardProps = {
  product: CatalogProduct
  onPresentations: () => void
  onEdit: () => void
  onTogglePublished: () => void
}

export function CatalogCard({
  product,
  onPresentations,
  onEdit,
  onTogglePublished,
}: CatalogCardProps) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-[#e2e7ee] bg-white shadow-[0_3px_5px_#14325202] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#ccd8e5] hover:shadow-[0_7px_22px_#1233570b]">
      <div
        className="relative m-[5px_5px_0] flex h-[162px] items-center justify-center overflow-hidden rounded-[7px] bg-[#f7f8fa] md:m-[7px_7px_0] md:h-[205px]"
        style={{ backgroundColor: visualTints[product.id] }}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="mt-[15px] block h-[110px] max-w-[70%] object-contain mix-blend-multiply md:mt-0 md:h-[155px]"
          />
        ) : (
          <PackageIcon
            aria-label={product.name}
            strokeWidth={1}
            className="m-auto h-[95px] w-[75px] text-[#91a8be]"
          />
        )}
        <span className="absolute top-[9px] right-[9px] flex items-center gap-1 rounded-[5px] bg-white px-1.5 py-1 text-xs text-[#345d8b] md:top-3 md:right-3">
          <CheckIcon size={12} />
          {product.published ? 'Publicado' : 'Pausado'}
        </span>
      </div>
      <div className="px-[15px] pt-[15px] pb-[15px] md:pb-[22px] wide:px-[19px] wide:pt-[17px]">
        <span className="block text-xs leading-6 tracking-[0.65px] text-[#9aa5b3]">
          {product.brand} · {product.sku}
        </span>
        <h3 className="mt-1.5 text-base leading-normal font-[650] md:text-[17px]">
          {product.name}
        </h3>
        <p className="mt-1 text-xs leading-[1.4] text-[#8a95a4] md:text-[13px]">
          {product.description}
        </p>
        <div className="my-5 block border-b border-[#edf0f4] pb-[18px] text-xs text-[#8a97a8] md:flex md:items-center md:justify-between md:text-sm">
          <span>Precio por {pricingLabel(product)}</span>
          <strong className="mt-[7px] block text-lg leading-normal font-bold text-[#2b486a] md:mt-0 md:inline">
            {formatPesos(catalogPriceCents(product))}
          </strong>
        </div>
        <p className="mt-1 text-[11px] leading-[1.4] text-[#8a95a4]">
          Puede variar por lote. El inventario se lleva en {product.baseUnit}.
        </p>
        <CatalogButton
          className="mt-3 mb-[5px] w-full"
          onClick={onPresentations}
        >
          <ScanLineIcon className="size-4" />
          Presentaciones y códigos
        </CatalogButton>
        <div className="my-3.5 flex flex-wrap gap-[9px]">
          <CatalogButton
            className="min-h-9 flex-1 p-2 text-xs"
            onClick={onEdit}
          >
            Editar
          </CatalogButton>
          <CatalogButton
            className="min-h-9 flex-1 p-2 text-xs"
            onClick={onTogglePublished}
          >
            {product.published ? 'Pausar' : 'Publicar'}
          </CatalogButton>
        </div>
        <Link
          to="/inventario"
          search={{ q: product.name }}
          className="inline-flex min-h-9 items-center justify-center gap-[7px] text-center text-xs leading-normal md:min-h-0 md:justify-start md:text-left font-[650] text-[#244e7b] hover:underline md:text-sm"
        >
          Consultar inventario <ArrowRightIcon size={15} />
        </Link>
      </div>
    </article>
  )
}
