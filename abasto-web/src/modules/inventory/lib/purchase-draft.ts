import { parsePesosToCents } from '#/modules/inventory/lib/cents'
import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import type { PurchaseInput } from '#/modules/inventory/services/purchases'

/** What a purchase row needs of one product; the box is its default presentation. */
export type PurchaseProduct = {
  id: string
  name: string
  presentations: ReadonlyArray<{
    id: string
    factor: number
    isDefault: boolean
  }>
}

/** One product row of the bulk entry; every field stays as typed text. */
export type PurchaseEntryRow = {
  /** Whole boxes that arrived. */
  boxes: string
  /** Cost of the whole lot in pesos. */
  cost: string
  /** Sale price per box in pesos; blank keeps the prefilled one. */
  salePrice: string
  lotCode: string
  expiresOn: string
}

export type PurchaseDraft = {
  supplierId: string
  warehouseId: string
  reference: string
  purchasedOn: string
  /** Rows by product id; products never touched have no entry. */
  rows: Partial<Record<string, PurchaseEntryRow>>
}

export const SALE_BELOW_COST_MESSAGE =
  'El precio de salida no puede ser menor que el costo por caja.'

export const emptyRow = (): PurchaseEntryRow => ({
  boxes: '',
  cost: '',
  salePrice: '',
  lotCode: '',
  expiresOn: '',
})

/** The box of a product: its default presentation, else the first one. */
export const boxOf = <
  TPresentation extends PurchaseProduct['presentations'][number],
>(
  presentations: ReadonlyArray<TPresentation>,
): TPresentation | undefined =>
  presentations.find((item) => item.isDefault) ?? presentations.at(0)

const WHOLE = /^\d+$/

/** Boxes as a positive whole number; null while blank, zero or invalid. */
function wholeBoxes(text: string): number | null {
  const clean = text.trim()
  if (!WHOLE.test(clean)) return null
  const value = Number(clean)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

/** Cost of one box (can have fractions of a cent); null until boxes and cost are valid. */
export function costPerBoxCents(row: PurchaseEntryRow): number | null {
  const boxes = wholeBoxes(row.boxes)
  const cost = parsePesosToCents(row.cost, { allowZero: true })
  if (boxes === null || !cost.ok) return null
  return cost.value / boxes
}

const centsText = (cents: number) => (cents / 100).toFixed(2)

/**
 * Text shown in the sale price input: what the user typed, else the standard
 * price, else the cost per box rounded up to the cent.
 */
export function salePriceText(
  row: PurchaseEntryRow,
  standardCents: number | null,
): string {
  if (row.salePrice) return row.salePrice
  if (standardCents !== null) return centsText(standardCents)
  const cost = costPerBoxCents(row)
  return cost === null || cost === 0 ? '' : centsText(Math.ceil(cost))
}

/** Message when the effective sale price is below the cost per box. */
export function salePriceError(
  row: PurchaseEntryRow,
  effectiveSalePriceCents: number | null,
): string | null {
  const boxes = wholeBoxes(row.boxes)
  const cost = parsePesosToCents(row.cost, { allowZero: true })
  if (boxes === null || !cost.ok || effectiveSalePriceCents === null) {
    return null
  }
  // Compare whole lots so fractions of a cent per box do not round away.
  return effectiveSalePriceCents * boxes < cost.value
    ? SALE_BELOW_COST_MESSAGE
    : null
}

function lineFromRow(
  product: PurchaseProduct,
  row: PurchaseEntryRow,
  standardCents: number | null,
): Parsed<PurchaseInput['lines'][number]> | null {
  const typed = row.boxes.trim()
  if (!typed) return null
  if (!WHOLE.test(typed)) return fail('las cajas deben ser un número entero.')
  const boxes = wholeBoxes(typed)
  // Zero boxes means the product did not arrive.
  if (boxes === null) return null
  const cost = parsePesosToCents(row.cost, { allowZero: true })
  if (!cost.ok) return cost
  const text = salePriceText(row, standardCents)
  let salePriceCents: number | undefined
  if (text) {
    const sale = parsePesosToCents(text)
    if (!sale.ok) return sale
    const error = salePriceError(row, sale.value)
    if (error) return fail(error)
    salePriceCents = sale.value
  }
  const factor = boxOf(product.presentations)?.factor ?? 1
  const lotCode = row.lotCode.trim()
  return {
    ok: true,
    value: {
      productId: product.id,
      quantity: boxes * factor,
      totalCostCents: cost.value,
      ...(salePriceCents === undefined ? {} : { salePriceCents }),
      ...(lotCode ? { lotCode } : {}),
      ...(row.expiresOn ? { expiresOn: row.expiresOn } : {}),
    },
  }
}

/** Bulk entry → service input: only rows with boxes, quantities in base units, prices in cents. */
export function purchaseInputFromDraft(
  draft: PurchaseDraft,
  products: ReadonlyArray<PurchaseProduct>,
  standardByProductId: Readonly<Record<string, number>>,
): Parsed<PurchaseInput> {
  if (!draft.supplierId) return fail('Selecciona el proveedor.')
  if (!draft.warehouseId) return fail('Selecciona el almacén.')
  if (!draft.purchasedOn) return fail('Indica la fecha de la compra.')
  const lines: PurchaseInput['lines'] = []
  for (const product of products) {
    const row = draft.rows[product.id]
    if (!row) continue
    const parsed = lineFromRow(
      product,
      row,
      standardByProductId[product.id] ?? null,
    )
    if (!parsed) continue
    if (!parsed.ok) return fail(`${product.name}: ${parsed.message}`)
    lines.push(parsed.value)
  }
  if (!lines.length) {
    return fail('Escribe cuántas cajas llegaron de al menos un producto.')
  }
  const reference = draft.reference.trim()
  return {
    ok: true,
    value: {
      supplierId: draft.supplierId,
      warehouseId: draft.warehouseId,
      ...(reference ? { reference } : {}),
      purchasedOn: draft.purchasedOn,
      lines,
    },
  }
}
