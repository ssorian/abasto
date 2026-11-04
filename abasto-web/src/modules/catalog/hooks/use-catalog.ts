import { useState } from 'react'

import { seedCatalog } from '#/modules/catalog/lib/catalog-seed'

import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

/** Local, non-persistent catalog seeded from the demo products. */
export function useCatalog() {
  const [products, setProducts] =
    useState<ReadonlyArray<CatalogProduct>>(seedCatalog)

  const upsertProduct = (product: CatalogProduct) =>
    setProducts((current) =>
      current.some(({ id }) => id === product.id)
        ? current.map((item) => (item.id === product.id ? product : item))
        : [...current, product],
    )

  return { products, upsertProduct }
}
