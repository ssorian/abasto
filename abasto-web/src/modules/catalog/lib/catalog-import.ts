import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
import type { ProductInput } from '#/modules/catalog/services/products'
import type { ImportProductRow } from '#/modules/product-import/services/import-products'
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
 * Input for `createProduct` from one validated CSV row: the product and its
 * presentations. Price and minimum stock are per warehouse and travel beside
 * it (see `importRowFromCsv`).
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

/**
 * Row sent to the import: the product, `precio_venta` (per main presentation,
 * in cents) and `stock_minimo` (base units), both saved in the chosen warehouse.
 */
export const importRowFromCsv = (
  row: CatalogImportProduct,
): ImportProductRow => ({
  product: productInputFromImport(row),
  priceCents: Math.round(row.price * 100),
  minimum: row.minStock,
})
