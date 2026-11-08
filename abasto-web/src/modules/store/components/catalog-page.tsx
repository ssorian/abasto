import { SearchIcon, XIcon } from 'lucide-react'
import { useDeferredValue, useMemo } from 'react'

import { cn } from '#/lib/utils/cn'
import { BrandNav } from '#/modules/store/components/brand-nav'
import { ProductCard } from '#/modules/store/components/product-card'
import {
  brandTabs,
  categoriesOf,
  filterProducts,
  inStockFirst,
} from '#/modules/store/lib/catalog-filter'
import type { CartLine } from '#/modules/store/lib/cart'
import type { StoreProduct } from '#/modules/store/services/storefront'

type CatalogPageProps = {
  catalog: Array<StoreProduct>
  warehouseName: string
  query: string
  brand: string | undefined
  category: string | undefined
  lines: Array<CartLine>
  onQueryChange: (query: string) => void
  onBrandChange: (brand: string | undefined) => void
  onCategoryChange: (category: string | undefined) => void
  onSet: (presentationId: string, quantity: number) => void
}

const chip =
  'min-h-11 shrink-0 rounded-full border px-4 text-[14px] font-semibold transition-colors duration-150 motion-reduce:transition-none'

export function CatalogPage({
  catalog,
  warehouseName,
  query,
  brand,
  category,
  lines,
  onQueryChange,
  onBrandChange,
  onCategoryChange,
  onSet,
}: CatalogPageProps) {
  const tabs = useMemo(() => brandTabs(catalog), [catalog])
  const categories = useMemo(() => categoriesOf(catalog), [catalog])
  const deferredQuery = useDeferredValue(query)
  const visible = useMemo(
    () =>
      inStockFirst(filterProducts(catalog, deferredQuery, { brand, category })),
    [catalog, deferredQuery, brand, category],
  )

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[208px_minmax(0,1fr)] lg:items-start lg:gap-6">
      <BrandNav
        tabs={tabs}
        total={catalog.length}
        value={brand}
        onChange={onBrandChange}
      />

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <div className="relative">
            <SearchIcon
              aria-hidden
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-st-muted"
            />
            <input
              type="search"
              aria-label="Buscar productos"
              placeholder="Buscar producto o marca"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="st-field pr-12 pl-11 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                aria-label="Borrar búsqueda"
                onClick={() => onQueryChange('')}
                className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center"
              >
                <XIcon className="size-5" strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>

          {categories.length > 1 ? (
            <div
              role="group"
              aria-label="Categorías"
              className="flex gap-2 overflow-x-auto [scrollbar-width:none]"
            >
              {[undefined, ...categories].map((name) => {
                const pressed = category === name
                return (
                  <button
                    key={name ?? 'all'}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => onCategoryChange(name)}
                    className={cn(
                      chip,
                      pressed
                        ? 'border-st-plum/40 bg-st-plum-tint text-st-plum-ink'
                        : 'border-st-line-strong bg-st-card text-st-ink-soft hover:bg-st-sunk',
                    )}
                  >
                    {name ?? 'Todas'}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <p className="text-[14px] font-medium text-st-muted" aria-live="polite">
          {visible.length === 1 ? '1 producto' : `${visible.length} productos`}{' '}
          · {warehouseName}
        </p>

        {visible.length ? (
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 xl:grid-cols-2">
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                lines={lines}
                onSet={onSet}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-st-line-strong bg-st-card p-8 text-center">
            <p className="st-stencil text-lg">
              {catalog.length
                ? 'Sin productos con ese filtro'
                : 'Este almacén aún no tiene productos en la tienda'}
            </p>
            <p className="mt-1 text-sm text-st-muted">
              {catalog.length
                ? 'Prueba con otra palabra o quita la marca o la categoría.'
                : 'Prueba con otro almacén o vuelve más tarde.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
