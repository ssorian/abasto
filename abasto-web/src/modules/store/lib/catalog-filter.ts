import type { StoreProduct } from '#/modules/store/services/storefront'

/** URL value for products that have no brand. */
export const NO_BRAND = '~sin-marca'

export type BrandTab = { value: string; label: string; count: number }

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export const brandValue = (product: StoreProduct) => product.brand || NO_BRAND

export function filterProducts(
  catalog: Array<StoreProduct>,
  query: string,
  filters: { brand?: string; category?: string } = {},
) {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  return catalog.filter((product) => {
    if (filters.category && product.category !== filters.category) return false
    if (filters.brand && brandValue(product) !== filters.brand) return false
    const haystack = fold(`${product.name} ${product.brand}`)
    return terms.every((term) => haystack.includes(term))
  })
}

/** Brands with their product count, biggest first (ties by name). */
export function brandTabs(catalog: Array<StoreProduct>): Array<BrandTab> {
  const counts = new Map<string, number>()
  for (const product of catalog) {
    const value = brandValue(product)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts]
    .map(([value, count]) => ({
      value,
      label: value === NO_BRAND ? 'Sin marca' : value,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
}

export const categoriesOf = (catalog: Array<StoreProduct>) =>
  [...new Set(catalog.map((product) => product.category))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )

/** Products with something to pick first; sold-out ones follow, order kept. */
export function inStockFirst(products: Array<StoreProduct>) {
  const sellable = (product: StoreProduct) =>
    product.presentations.some((entry) => entry.availability !== 'Agotado')
  return [
    ...products.filter(sellable),
    ...products.filter((product) => !sellable(product)),
  ]
}
