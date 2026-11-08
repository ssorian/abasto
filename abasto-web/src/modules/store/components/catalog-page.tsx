import { SearchIcon } from 'lucide-react'
import { useDeferredValue, useMemo } from 'react'

import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils/cn'
import { ProductCard } from '#/modules/store/components/product-card'
import type { StoreProduct } from '#/modules/store/services/storefront'

type CatalogPageProps = {
  catalog: Array<StoreProduct>
  warehouseName: string
  query: string
  category: string | undefined
  onQueryChange: (query: string) => void
  onCategoryChange: (category: string | undefined) => void
  onAdd: (presentationId: string, quantity: number) => void
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export function filterProducts(
  catalog: Array<StoreProduct>,
  query: string,
  category: string | undefined,
) {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  return catalog.filter((product) => {
    if (category && product.category !== category) return false
    const haystack = fold(`${product.name} ${product.brand}`)
    return terms.every((term) => haystack.includes(term))
  })
}

const chip =
  'min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors'

export function CatalogPage({
  catalog,
  warehouseName,
  query,
  category,
  onQueryChange,
  onCategoryChange,
  onAdd,
}: CatalogPageProps) {
  const categories = useMemo(
    () =>
      [...new Set(catalog.map((product) => product.category))].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [catalog],
  )
  const deferredQuery = useDeferredValue(query)
  const visible = useMemo(
    () => filterProducts(catalog, deferredQuery, category),
    [catalog, deferredQuery, category],
  )

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted"
          />
          <Input
            type="search"
            aria-label="Buscar productos"
            placeholder="Buscar por producto o marca"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-12 rounded-xl bg-white pl-10 text-base"
          />
        </div>
        {categories.length > 1 ? (
          <div
            role="group"
            aria-label="Categorías"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          >
            <button
              type="button"
              aria-pressed={!category}
              onClick={() => onCategoryChange(undefined)}
              className={cn(
                chip,
                !category
                  ? 'border-ink-heading bg-ink-heading text-white'
                  : 'border-input bg-white text-ink-row hover:bg-accent',
              )}
            >
              Todo
            </button>
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={category === name}
                onClick={() => onCategoryChange(name)}
                className={cn(
                  chip,
                  category === name
                    ? 'border-ink-heading bg-ink-heading text-white'
                    : 'border-input bg-white text-ink-row hover:bg-accent',
                )}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="text-sm text-ink-muted" aria-live="polite">
        {visible.length === 1 ? '1 producto' : `${visible.length} productos`} en{' '}
        {warehouseName}
      </p>

      {visible.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={onAdd} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-input bg-white/60 p-8 text-center">
          <p className="font-semibold text-ink-figure">
            {catalog.length
              ? 'No encontramos productos con ese filtro.'
              : 'Este almacén aún no tiene productos en la tienda.'}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {catalog.length
              ? 'Prueba con otra palabra o quita la categoría.'
              : 'Prueba con otro almacén o vuelve más tarde.'}
          </p>
        </div>
      )}
    </div>
  )
}
