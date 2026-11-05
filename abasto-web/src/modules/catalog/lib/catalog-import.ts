import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
import type { ProductInput } from '#/modules/catalog/services/products'
import type {
  CatalogImportProduct,
  ImportReferenceProduct,
} from '#/modules/product-import/lib/import-types'

/** Catalog products as the CSV dialog needs them to detect duplicates. */
export function importReferenceProducts(
  products: ReadonlyArray<CatalogProduct>,
): Array<ImportReferenceProduct> {
  return products.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    unit: product.unit,
    barcodes: product.presentations.flatMap(({ barcode }) =>
      barcode ? [barcode] : [],
    ),
    presentations: product.presentations,
  }))
}

/**
 * Input for `createProduct` from one validated CSV row. Prices and minimum
 * stock are per warehouse, so `precio_venta` and `stock_minimo` are ignored.
 */
export function productInputFromImport(
  row: CatalogImportProduct,
): ProductInput {
  const main = {
    name: row.presentation,
    factor: row.factor,
    barcode: row.barcode || null,
    active: true,
  }
  const base = { name: row.unit, factor: 1, barcode: null, active: true }
  return {
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    description: row.description,
    category: row.category,
    unit: row.unit,
    published: true,
    presentations: row.factor === 1 ? [main] : [base, main],
    defaultIndex: row.factor === 1 ? 0 : 1,
  }
}
