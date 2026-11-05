import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** Accent-insensitive match over name, brand, SKU and presentation barcodes. */
export function filterCatalog(
  products: ReadonlyArray<CatalogProduct>,
  query: string,
) {
  const needle = normalize(query)
  return products.filter((product) =>
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

export function publicationCounts(products: ReadonlyArray<CatalogProduct>) {
  const published = products.filter((product) => product.published).length
  return { published, paused: products.length - published }
}
