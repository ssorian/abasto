import { demoProducts } from '#/shared/demo/products'

import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

export const seedCatalog: ReadonlyArray<CatalogProduct> = demoProducts.map(
  (product) => ({ ...product, published: true }),
)
