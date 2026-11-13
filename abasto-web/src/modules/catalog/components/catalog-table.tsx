import { Link } from '@tanstack/react-router'
import { TagIcon } from 'lucide-react'

import { ProductImage } from '#/components/product-image'
import { StatusBadge } from '#/components/status-badge'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { presentationLabel } from '#/modules/catalog/lib/catalog-presentations'
import { formatCents } from '#/modules/pricing/lib/money'
import { formatPieceCost } from '#/modules/pricing/lib/product-costs'

import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
import type { ProductGroup } from '#/modules/pricing/lib/price-table'

type CatalogTableProps = {
  products: ReadonlyArray<CatalogProduct>
  /** Product id → its prices in the selected warehouse. */
  groups: ReadonlyMap<string, ProductGroup>
  supplierNames: ReadonlyMap<string, string>
  /** Whether the actor sees sale prices (a warehouse is selected). */
  showPrices: boolean
  /** Net cost per piece in ten-thousandths; absent for anyone who may not see costs. */
  costOf?: (product: CatalogProduct) => number
  canManage: boolean
  onPrices: (productId: string) => void
  onEdit: (productId: string) => void
  /** Brings an archived product back; shown on archived rows to the owner. */
  onRestore: (productId: string) => void
}

const head =
  'px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-[#907e84]'
const cell = 'px-3 py-3 align-middle text-sm text-[#513f45]'

/** Dense catalog view: one row per product. */
export function CatalogTable({
  products,
  groups,
  supplierNames,
  showPrices,
  costOf,
  canManage,
  onPrices,
  onEdit,
  onRestore,
}: CatalogTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#eee8e2] bg-white">
      <table className="w-full min-w-[860px] border-collapse">
        <thead className="border-b border-[#f4f1ed] bg-[#faf9f7]">
          <tr>
            <th scope="col" className={head}>
              Producto
            </th>
            <th scope="col" className={head}>
              Presentación principal
            </th>
            <th scope="col" className={head}>
              Proveedor
            </th>
            {costOf && (
              <th scope="col" className={`${head} text-right`}>
                Costo por pieza
              </th>
            )}
            {showPrices && (
              <th scope="col" className={head}>
                Precios de venta
              </th>
            )}
            <th scope="col" className={head}>
              Estado
            </th>
            <th scope="col" className={head}>
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f4f1ed]">
          {products.map((product) => {
            const group = groups.get(product.id)
            const supplier = product.supplierId
              ? supplierNames.get(product.supplierId)
              : undefined
            return (
              <tr key={product.id}>
                <td className={cell}>
                  <div className="flex items-center gap-3">
                    {product.imageUrl && (
                      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#faf9f7]">
                        <ProductImage
                          src={product.imageUrl}
                          name={product.name}
                          className="size-full object-contain mix-blend-multiply"
                          placeholderClassName="size-6"
                        />
                      </span>
                    )}
                    <div className="min-w-0">
                      <strong className="block font-[650] text-[#3b2251]">
                        {product.name}
                      </strong>
                      <span className="block text-xs text-[#ae9fa4]">
                        {[product.brand, product.sku]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                  </div>
                </td>
                <td className={cell}>{presentationLabel(product)}</td>
                <td className={cell}>{supplier ?? '—'}</td>
                {costOf && (
                  <td className={`${cell} text-right`}>
                    {formatPieceCost(costOf(product))}
                  </td>
                )}
                {showPrices && (
                  <td className={cell}>
                    {group?.rows.length ? (
                      <ul className="space-y-0.5">
                        {group.rows.map((row) => (
                          <li
                            key={row.presentationId}
                            className="flex items-baseline gap-2 whitespace-nowrap"
                          >
                            <span className="text-xs text-[#a29096]">
                              {row.presentationName}
                            </span>
                            <strong
                              className={
                                row.priceCents === null
                                  ? 'font-normal text-[#ae9fa4]'
                                  : 'font-bold text-[#4d2b6a]'
                              }
                            >
                              {row.priceCents === null
                                ? 'Sin precio'
                                : formatCents(row.priceCents)}
                            </strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-[#ae9fa4]">—</span>
                    )}
                  </td>
                )}
                <td className={cell}>
                  {product.archivedAt ? (
                    <StatusBadge tone="gray">Archivado</StatusBadge>
                  ) : (
                    <StatusBadge tone={product.published ? 'green' : 'gray'}>
                      {product.published ? 'Publicado' : 'Pausado'}
                    </StatusBadge>
                  )}
                </td>
                <td className={cell}>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    {product.archivedAt ? (
                      canManage && (
                        <CatalogButton
                          className="min-h-9 px-3"
                          onClick={() => onRestore(product.id)}
                        >
                          Restaurar
                        </CatalogButton>
                      )
                    ) : showPrices && group?.rows.length ? (
                      <CatalogButton
                        className="min-h-9 px-3"
                        onClick={() => onPrices(product.id)}
                      >
                        <TagIcon className="size-4" />
                        Precios
                      </CatalogButton>
                    ) : null}
                    {canManage && !product.archivedAt && (
                      <CatalogButton
                        className="min-h-9 px-3"
                        onClick={() => onEdit(product.id)}
                      >
                        Editar
                      </CatalogButton>
                    )}
                    <Link
                      to="/inventario"
                      search={{ q: product.name }}
                      className="text-sm font-[650] text-ink-link hover:underline"
                    >
                      Consultar inventario
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
