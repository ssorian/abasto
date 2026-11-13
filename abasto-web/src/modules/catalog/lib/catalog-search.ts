import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/**
 * Accent-insensitive match over name, brand, SKU and presentation barcodes,
 * combined (AND) with the supplier filter. An empty `supplierId` means all
 * suppliers, including products without one.
 */
export function filterCatalog(
  products: ReadonlyArray<CatalogProduct>,
  query: string,
  supplierId = '',
) {
  const needle = normalize(query)
  return products.filter(
    (product) =>
      (!supplierId || product.supplierId === supplierId) &&
      normalize(
        [
          product.name,
          product.brand,
          product.sku,
          ...product.presentations.map(({ barcode }) => barcode ?? ''),
        ].join(' '),
      ).includes(needle),
  )
}

/** Active (not archived) products, and the archived ones. */
export function splitArchived(products: ReadonlyArray<CatalogProduct>) {
  return {
    active: products.filter((product) => !product.archivedAt),
    archived: products.filter((product) => product.archivedAt),
  }
}

export function publicationCounts(products: ReadonlyArray<CatalogProduct>) {
  const published = products.filter((product) => product.published).length
  return { published, paused: products.length - published }
}
