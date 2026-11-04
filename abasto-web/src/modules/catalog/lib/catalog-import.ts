import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
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
    unit: product.baseUnit,
    barcodes: [
      product.barcode,
      ...product.presentations.map(({ barcode }) => barcode),
    ].filter(Boolean),
    presentations: product.presentations,
  }))
}

/**
 * Builds a new catalog product from one validated CSV row. Catalog imports
 * only add products; the dialog already rejects existing SKUs and barcodes.
 */
export function productFromImport(
  row: CatalogImportProduct,
  id: string,
): CatalogProduct {
  const packCents = Math.round(row.price * 100)
  const common = {
    id,
    name: row.name,
    brand: row.brand,
    description: row.description,
    category: row.category,
    sku: row.sku,
    barcode: row.barcode,
    image: '',
    baseUnit: row.unit,
    costCents: 0,
    published: true,
  }

  if (row.factor === 1)
    return {
      ...common,
      defaultPresentationId: 'unit',
      presentations: [
        {
          id: 'unit',
          name: row.presentation,
          factor: 1,
          priceCents: packCents,
          barcode: row.barcode,
          active: true,
        },
      ],
    }

  return {
    ...common,
    defaultPresentationId: 'pack',
    presentations: [
      {
        id: 'unit',
        name: 'Pieza',
        factor: 1,
        priceCents: Math.round(packCents / row.factor),
        barcode: '',
        active: true,
      },
      {
        id: 'pack',
        name: row.presentation,
        factor: row.factor,
        priceCents: packCents,
        barcode: row.barcode,
        active: true,
      },
    ],
  }
}
