import { normalize } from '#/modules/inventory/lib/format'
import { parseBoxCount } from '#/modules/inventory/lib/box-count'
import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import {
  netCostPerBoxCents,
  netCostPerPiece,
} from '#/modules/catalog/lib/supplier-cost'
import type { SupplierOrderInput } from '#/modules/inventory/services/supplier-orders'

type PresentationLike = { factor: number; active: boolean; isDefault: boolean }

/** What an order row needs of one catalog product. */
export type OrderProduct = {
  id: string
  name: string
  sku: string
  supplierId: string | null
  /** Supplier amounts per piece, in ten-thousandths of a peso. */
  listPricePerPiece: number
  fixedDiscountPerPiece: number
  promotionPerPiece: number
  presentations: ReadonlyArray<PresentationLike>
}

/** Order form state; boxes stay as typed text by product id. */
export type OrderDraft = {
  supplierId: string
  warehouseId: string
  expectedOn: string
  reference: string
  boxes: Readonly<Record<string, string | undefined>>
}

export const PRICE_BELOW_COST_MESSAGE =
  'El costo por caja supera el precio estándar. Actualiza el precio estándar del producto en el catálogo.'
export const MISSING_COST_MESSAGE =
  'Este producto no tiene costo del proveedor. Captura la lista de precios en el catálogo.'

/** Pieces per box: the default active presentation, else 1. */
export const boxFactorOf = (product: OrderProduct) =>
  product.presentations.find((item) => item.isDefault && item.active)?.factor ??
  1

/** Catalog net cost of one box in cents (same rule the server applies). */
export const costPerBoxOf = (product: OrderProduct) =>
  netCostPerBoxCents(
    Math.max(
      netCostPerPiece(
        product.listPricePerPiece,
        product.fixedDiscountPerPiece,
        product.promotionPerPiece,
      ),
      0,
    ),
    boxFactorOf(product),
  )

/** Non-blocking warnings of a row; `standardCents` is the box price in the warehouse. */
export function rowWarnings(
  product: OrderProduct,
  standardCents: number | undefined,
): Array<string> {
  const warnings: Array<string> = []
  if (product.listPricePerPiece === 0) warnings.push(MISSING_COST_MESSAGE)
  if (standardCents === undefined || costPerBoxOf(product) > standardCents) {
    warnings.push(PRICE_BELOW_COST_MESSAGE)
  }
  return warnings
}

/** Products of one supplier matching the search by name or SKU. */
export function supplierProducts<TProduct extends OrderProduct>(
  products: ReadonlyArray<TProduct>,
  supplierId: string,
  query: string,
): Array<TProduct> {
  if (!supplierId) return []
  const needle = normalize(query.trim())
  return products.filter(
    (product) =>
      product.supplierId === supplierId &&
      (!needle ||
        normalize(product.name).includes(needle) ||
        normalize(product.sku).includes(needle)),
  )
}

const boxesOf = (text: string | undefined) => {
  const parsed = parseBoxCount(text ?? '')
  return parsed.ok ? parsed.value : 0
}

/** Cost of the typed boxes at the catalog cost per box. */
export function orderTotalCents(
  products: ReadonlyArray<OrderProduct>,
  boxes: OrderDraft['boxes'],
): number {
  return products.reduce(
    (total, product) =>
      total + boxesOf(boxes[product.id]) * costPerBoxOf(product),
    0,
  )
}

/** Order form → server input: rows with boxes of the chosen supplier; no prices. */
export function orderInputFromDraft(
  draft: OrderDraft,
  products: ReadonlyArray<OrderProduct>,
): Parsed<SupplierOrderInput> {
  if (!draft.supplierId) return fail('Selecciona el proveedor.')
  if (!draft.warehouseId) return fail('Selecciona el almacén.')
  const lines: SupplierOrderInput['lines'] = []
  for (const product of products) {
    if (product.supplierId !== draft.supplierId) continue
    const parsed = parseBoxCount(draft.boxes[product.id] ?? '')
    if (!parsed.ok) return fail(`${product.name}: ${parsed.message}`)
    if (parsed.value > 0)
      lines.push({ productId: product.id, boxes: parsed.value })
  }
  if (!lines.length) return fail('Escribe las cajas de al menos un producto.')
  const reference = draft.reference.trim()
  return {
    ok: true,
    value: {
      supplierId: draft.supplierId,
      warehouseId: draft.warehouseId,
      ...(draft.expectedOn ? { expectedOn: draft.expectedOn } : {}),
      ...(reference ? { reference } : {}),
      lines,
    },
  }
}
