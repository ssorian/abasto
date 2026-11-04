import { z } from 'zod'

import { isValidMoney, toCents } from '#/modules/catalog/lib/catalog-money'
import { derivedPriceCents } from '#/modules/catalog/lib/catalog-presentations'

import type {
  CatalogProduct,
  PresentationDraft,
  Validation,
} from '#/modules/catalog/lib/catalog-types'
import type { Presentation } from '#/shared/demo/types'

const MESSAGES = {
  baseUnit: 'Conserva una presentación activa de una unidad base.',
  rows: 'Revisa nombre, equivalencia y precio de cada presentación.',
  factorChange:
    'Una equivalencia existente no cambia: desactívala y crea otra presentación.',
  reserved: 'Este código está reservado para etiquetas internas.',
  duplicateBarcode: 'Ese código de barras ya pertenece a otra presentación.',
  defaultInactive:
    'Selecciona una presentación activa para la venta por defecto.',
}

const reservedBarcode = /^AB[0-9A-F]{10}$/

const rowSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  factor: z.number().int().min(1),
})

const fixedPriceSchema = z
  .number()
  .refine(isValidMoney)
  .refine((value) => value > 0)

type Saved = { presentations: Array<Presentation>; defaultId: string }

const fail = (message: string): Validation<Saved> => ({ ok: false, message })

/** Validates the presentations dialog in the reference's order. */
export function validatePresentations(
  product: CatalogProduct,
  catalog: ReadonlyArray<CatalogProduct>,
  rows: ReadonlyArray<PresentationDraft>,
  defaultId: string,
): Validation<Saved> {
  if (!rows.some((row) => row.factor === 1 && row.active))
    return fail(MESSAGES.baseUnit)

  const ids = new Set<string>()
  const codes = new Set<string>()
  const otherBarcodes = new Set(
    catalog
      .filter(({ id }) => id !== product.id)
      .flatMap((other) => [
        other.barcode,
        ...other.presentations.map(({ barcode }) => barcode),
      ]),
  )

  for (const row of rows) {
    const fixed = row.price.trim() === '' ? undefined : Number(row.price)
    if (
      !rowSchema.safeParse(row).success ||
      ids.has(row.id) ||
      (fixed !== undefined && !fixedPriceSchema.safeParse(fixed).success)
    )
      return fail(MESSAGES.rows)
    ids.add(row.id)

    const old = product.presentations.find(({ id }) => id === row.id)
    if (old && old.factor !== row.factor) return fail(MESSAGES.factorChange)

    if (row.barcode) {
      if (reservedBarcode.test(row.barcode)) return fail(MESSAGES.reserved)
      if (codes.has(row.barcode) || otherBarcodes.has(row.barcode))
        return fail(MESSAGES.duplicateBarcode)
      codes.add(row.barcode)
    }
  }

  if (!rows.some((row) => row.id === defaultId && row.active))
    return fail(MESSAGES.defaultInactive)

  return {
    ok: true,
    value: {
      defaultId,
      presentations: rows.map(({ price, ...row }) => ({
        ...row,
        priceCents:
          price.trim() === ''
            ? derivedPriceCents(product, row.factor)
            : toCents(Number(price)),
      })),
    },
  }
}
