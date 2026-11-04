import { z } from 'zod'

import { isValidMoney, toCents } from '#/modules/catalog/lib/catalog-money'
import { productFromDraft } from '#/modules/catalog/lib/product-draft'

import type {
  CatalogProduct,
  ProductDraft,
  Validation,
} from '#/modules/catalog/lib/catalog-types'

const MESSAGES = {
  required: 'Completa nombre, SKU, presentación, unidad y categoría.',
  numbers: 'Revisa el precio y el mínimo.',
  duplicateSku: 'El SKU ya existe.',
  reserved: 'Este código está reservado para etiquetas internas.',
  duplicateBarcode: 'El código de barras ya existe.',
}

/** Internal lot labels (AB + 10 hex digits) cannot be product barcodes. */
const reservedBarcode = /^AB[0-9A-F]{10}$/

const requiredSchema = z.object({
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  description: z.string().trim().min(1),
  unit: z.string().min(1),
  category: z.string().min(1),
})

/** Blank numeric fields behave as zero, like the reference's number inputs. */
const numberFrom = (value: string) => (value.trim() === '' ? 0 : Number(value))

const numbersSchema = z.object({
  price: z
    .number()
    .refine(isValidMoney)
    .refine((value) => value > 0),
  min: z.number().int().min(0),
})

const fail = (message: string): Validation<CatalogProduct> => ({
  ok: false,
  message,
})

function barcodeTaken(
  barcode: string,
  catalog: ReadonlyArray<CatalogProduct>,
  previous: CatalogProduct | undefined,
) {
  return (
    catalog.some(
      (product) =>
        product.id !== previous?.id &&
        (product.barcode === barcode ||
          product.presentations.some(
            (presentation) => presentation.barcode === barcode,
          )),
    ) ||
    (previous?.presentations.some(
      (presentation) =>
        presentation.id !== previous.defaultPresentationId &&
        presentation.barcode === barcode,
    ) ??
      false)
  )
}

/** Validates the product form in the reference's order and returns the product to store. */
export function validateProductDraft(
  draft: ProductDraft,
  catalog: ReadonlyArray<CatalogProduct>,
  previous: CatalogProduct | undefined,
  newId: () => string,
): Validation<CatalogProduct> {
  if (!requiredSchema.safeParse(draft).success) return fail(MESSAGES.required)

  const price = numberFrom(draft.price)
  if (!numbersSchema.safeParse({ price, min: numberFrom(draft.min) }).success)
    return fail(MESSAGES.numbers)

  const sku = draft.sku.trim().toLowerCase()
  if (
    catalog.some(
      (product) =>
        product.id !== previous?.id && product.sku.toLowerCase() === sku,
    )
  )
    return fail(MESSAGES.duplicateSku)

  const barcode = draft.barcode.trim()
  if (barcode && reservedBarcode.test(barcode)) return fail(MESSAGES.reserved)
  if (barcode && barcodeTaken(barcode, catalog, previous))
    return fail(MESSAGES.duplicateBarcode)

  return {
    ok: true,
    value: productFromDraft(draft, toCents(price), previous, newId),
  }
}
