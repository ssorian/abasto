import type { Presentation, Product } from '#/shared/demo/types'

/** Catalog entry: a demo product plus whether it accepts new orders. */
export type CatalogProduct = Product & { published: boolean }

/** Form state of the product dialog; numeric inputs stay as typed text. */
export type ProductDraft = {
  name: string
  brand: string
  sku: string
  barcode: string
  description: string
  unit: string
  category: string
  price: string
  min: string
  image: string
  published: boolean
}

/** Editable row of the presentations dialog; blank price means "calculate from the lot". */
export type PresentationDraft = Omit<Presentation, 'priceCents'> & {
  /** Fixed price typed by the user; blank derives it from the catalog price. */
  price: string
}

export const baseUnits = ['cajas', 'piezas', 'bultos', 'paquetes'] as const
export const categories = [
  'Bebidas',
  'Abarrotes',
  'Botanas',
  'Lácteos',
] as const

/** Failure raised by the validators; the message is shown as a toast. */
export type Validation<T> =
  { ok: true; value: T } | { ok: false; message: string }
