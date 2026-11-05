import { parsePesosToCents } from '#/modules/inventory/lib/cents'
import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import { toBaseUnits } from '#/modules/inventory/lib/quantity'
import type { PurchaseInput } from '#/modules/inventory/services/purchases'

/** One row of the purchase form; every field stays as typed text. */
export type PurchaseLineDraft = {
  /** Stable key for the UI. */
  key: string
  productId: string
  /** Presentation the quantity is typed in. */
  presentationId: string
  packs: string
  /** Loose base units. */
  loose: string
  /** Whole line cost in pesos. */
  cost: string
  lotCode: string
  expiresOn: string
}

export type PurchaseDraft = {
  supplierId: string
  warehouseId: string
  reference: string
  purchasedOn: string
  lines: Array<PurchaseLineDraft>
}

/** What the converter needs from the catalog. */
export type PurchaseCatalog = ReadonlyArray<{
  id: string
  presentations: ReadonlyArray<{ id: string; factor: number }>
}>

export const emptyLine = (key: string): PurchaseLineDraft => ({
  key,
  productId: '',
  presentationId: '',
  packs: '',
  loose: '',
  cost: '',
  lotCode: '',
  expiresOn: '',
})

function lineFromDraft(
  line: PurchaseLineDraft,
  products: PurchaseCatalog,
): Parsed<PurchaseInput['lines'][number]> {
  const product = products.find(({ id }) => id === line.productId)
  if (!product) return fail('selecciona el producto.')
  const presentation = product.presentations.find(
    ({ id }) => id === line.presentationId,
  )
  if (!presentation) return fail('selecciona la presentación.')
  const quantity = toBaseUnits({
    packs: line.packs,
    loose: line.loose,
    factor: presentation.factor,
  })
  if (!quantity.ok) return quantity
  const cost = parsePesosToCents(line.cost, { allowZero: true })
  if (!cost.ok) return cost
  const lotCode = line.lotCode.trim()
  return {
    ok: true,
    value: {
      productId: product.id,
      quantity: quantity.value,
      totalCostCents: cost.value,
      ...(lotCode ? { lotCode } : {}),
      ...(line.expiresOn ? { expiresOn: line.expiresOn } : {}),
    },
  }
}

/** Purchase form → service input: quantities in base units, costs in cents. */
export function purchaseInputFromDraft(
  draft: PurchaseDraft,
  products: PurchaseCatalog,
): Parsed<PurchaseInput> {
  if (!draft.supplierId) return fail('Selecciona el proveedor.')
  if (!draft.warehouseId) return fail('Selecciona el almacén.')
  if (!draft.purchasedOn) return fail('Indica la fecha de la compra.')
  if (!draft.lines.length) {
    return fail('Agrega al menos un producto a la compra.')
  }
  const lines: PurchaseInput['lines'] = []
  for (const [index, line] of draft.lines.entries()) {
    const parsed = lineFromDraft(line, products)
    if (!parsed.ok) return fail(`Línea ${index + 1}: ${parsed.message}`)
    lines.push(parsed.value)
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
