import type {
  Presentation,
  Product,
} from '#/modules/catalog/services/product-reads'
import type { Supplier } from '#/modules/catalog/services/suppliers'

/** Catalog entry as the server returns it: product plus its presentations. */
export type CatalogProduct = Product
export type CatalogPresentation = Presentation
export type CatalogSupplier = Supplier

/** Form state of the product dialog; every input stays as typed text. */
export type ProductDraft = {
  name: string
  brand: string
  sku: string
  /** Barcode of the first (base-unit) presentation; only used when creating. */
  barcode: string
  description: string
  unit: string
  category: string
  /** Supplier id; empty means no supplier. */
  supplierId: string
  published: boolean
}

/** Editable row of the presentations dialog. */
export type PresentationDraft = {
  /** Stable key for the UI; equals `id` for stored rows. */
  key: string
  /** Present only for rows that already exist on the server. */
  id?: string
  name: string
  factor: number
  barcode: string
  active: boolean
}

/** Form state of the supplier dialog. */
export type SupplierDraft = {
  name: string
  contact: string
  phone: string
  notes: string
  active: boolean
}

export const baseUnits = ['cajas', 'piezas', 'bultos', 'paquetes'] as const
export const categories = [
  'Bebidas',
  'Abarrotes',
  'Botanas',
  'Lácteos',
] as const
