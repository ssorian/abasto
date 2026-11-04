import type { WarehouseName } from '#/shared/demo/types'

export type ImportMode = 'catalog' | 'stock'

/** Minimal product shape the validator needs; callers map their own products to it. */
export type ImportReferenceProduct = {
  id: string
  sku: string
  name: string
  /** Base unit label, e.g. "piezas". */
  unit: string
  /** Every barcode already in use (product and presentations). */
  barcodes: ReadonlyArray<string>
  presentations: ReadonlyArray<{
    id: string
    name: string
    factor: number
    active: boolean
  }>
}

/** What the validator knows about the destination data. */
export type ImportContext = {
  products: ReadonlyArray<ImportReferenceProduct>
  /** True when the product already has stock or history in the warehouse. */
  hasStockHistory: (sku: string, warehouse: WarehouseName) => boolean
  categories: ReadonlyArray<string>
  baseUnits: ReadonlyArray<string>
  /** Fingerprints of files that were already imported. */
  importedFingerprints: ReadonlySet<string>
}

export type CatalogImportProduct = {
  sku: string
  name: string
  brand: string
  description: string
  category: string
  /** Base unit label. */
  unit: string
  /** Name of the main presentation. */
  presentation: string
  /** Base units per main presentation. */
  factor: number
  barcode: string
  /** MXN per main presentation. */
  price: number
  /** Minimum stock in base units. */
  minStock: number
}

export type StockImportEntry = {
  productId: string
  sku: string
  warehouse: WarehouseName
  presentationId: string
  /** Presentations received. */
  quantity: number
  /** Base units received. */
  baseQuantity: number
  /** MXN per presentation. */
  cost: number
  /** MXN per base unit. */
  baseCost: number
  lot: string
  expiry: string
  /** MXN per main presentation. */
  salePrice?: number
}

export type PreviewRow = {
  /** 1-based line in the file, header included. */
  line: number
  cells: Record<string, string>
  errors: Array<string>
  summary: string
  product?: CatalogImportProduct
  entry?: StockImportEntry
}

export type ImportPreview = {
  mode: ImportMode
  fingerprint: string
  rows: Array<PreviewRow>
  /** File-level errors, e.g. a file imported before. */
  errors: Array<string>
  invalidRows: number
  /** Sum of presentations × cost of the valid stock rows. */
  totalCost: number
}

/** Payload handed to `onApply` once the user confirms a valid file. */
export type ImportResult =
  | {
      mode: 'catalog'
      filename: string
      fingerprint: string
      products: Array<CatalogImportProduct>
    }
  | {
      mode: 'stock'
      filename: string
      fingerprint: string
      entries: Array<StockImportEntry>
    }
