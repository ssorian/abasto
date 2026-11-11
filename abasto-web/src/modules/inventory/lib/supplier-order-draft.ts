import {
  grossLineCents,
  netCostPerBoxCents,
  netCostPerPiece,
  netLineCents,
  netPerBoxOfLineCents,
} from '#/lib/utils/supplier-cost'
import { parseBoxCount } from '#/modules/inventory/lib/box-count'
import { normalize } from '#/modules/inventory/lib/format'
import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import type { SupplierOrderInput } from '#/modules/inventory/services/supplier-orders'

type PresentationLike = { factor: number; active: boolean; isDefault: boolean }

/** What an order row needs of one catalog product. */
export type OrderProduct = {
  id: string
  name: string
  sku: string
  supplierId: string | null
  /** Supplier list price, discount and promotion per piece, in ten-thousandths of a peso. */
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
export const NO_STANDARD_PRICE_MESSAGE = 'Sin precio estándar en este almacén'
export const NO_LIST_PRICE_MESSAGE = 'Sin costo por pieza'
export const NET_ABOVE_LIST_PRICE_MESSAGE =
  'El descuento y la promoción no pueden superar el costo por pieza.'

/** Pieces per box: the default presentation, active or not (the server's rule), else 1. */
export const boxFactorOf = (product: OrderProduct) =>
  product.presentations.find((item) => item.isDefault)?.factor ?? 1

const boxesOf = (text: string | undefined) => {
  const parsed = parseBoxCount(text ?? '')
  return parsed.ok ? parsed.value : 0
}

/**
 * Figures of a row from the typed boxes and the product's catalog amounts (same
 * rules as the server); unparsable boxes count as zero and rows without boxes
 * cost nothing. `exceedsList` marks discounts above the list price; the net
 * figures then show zero instead of a negative cost.
 */
export function rowOf(product: OrderProduct, boxesText: string | undefined) {
  const boxes = boxesOf(boxesText)
  const quantity = boxes * boxFactorOf(product)
  const grossCents = grossLineCents(quantity, product.listPricePerPiece)
  const net =
    boxes > 0
      ? netLineCents(
          grossCents,
          quantity,
          product.fixedDiscountPerPiece,
          product.promotionPerPiece,
        )
      : 0
  const exceedsList = net < 0
  const netCents = Math.max(net, 0)
  return {
    boxes,
    grossCents,
    listPrice: product.listPricePerPiece,
    netLineCents: netCents,
    netPerBoxCents: netPerBoxOfLineCents(netCents, boxes),
    exceedsList,
  }
}

/** Standard box price of a product in the receiving warehouse. */
export type StandardPrice =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'known'; priceCents: number }

/** `prices` is undefined while they load; after that a product without an entry has none. */
export function standardPriceOf(
  prices: Readonly<Partial<Record<string, number>>> | undefined,
  productId: string,
): StandardPrice {
  if (!prices) return { state: 'loading' }
  const priceCents = prices[productId]
  return priceCents === undefined
    ? { state: 'missing' }
    : { state: 'known', priceCents }
}

/** Net cost per piece (ten-thousandths) and per box (cents) from the catalog, whatever the boxes typed. */
export function unitCostOf(product: OrderProduct) {
  const netPerPiece = Math.max(
    netCostPerPiece(
      product.listPricePerPiece,
      product.fixedDiscountPerPiece,
      product.promotionPerPiece,
    ),
    0,
  )
  return {
    netPerPiece,
    netPerBoxCents: netCostPerBoxCents(netPerPiece, boxFactorOf(product)),
  }
}

/**
 * Non-blocking warnings of a row. A missing list price warns on every row; the
 * standard price checks only apply to rows being ordered and stay quiet while
 * the standard prices load.
 */
export function rowWarnings(
  row: { boxes: number; netPerBoxCents: number; listPrice: number },
  standard: StandardPrice,
): Array<string> {
  const warnings: Array<string> = []
  if (row.listPrice <= 0) warnings.push(NO_LIST_PRICE_MESSAGE)
  if (row.boxes <= 0 || standard.state === 'loading') return warnings
  if (standard.state === 'missing') {
    warnings.push(NO_STANDARD_PRICE_MESSAGE)
  } else if (row.netPerBoxCents > standard.priceCents) {
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

/** Sum of the net line costs of the typed rows. */
export function orderTotalCents(
  products: ReadonlyArray<OrderProduct>,
  draft: Pick<OrderDraft, 'boxes'>,
): number {
  return products.reduce(
    (total, product) =>
      total + rowOf(product, draft.boxes[product.id]).netLineCents,
    0,
  )
}

/** Parse result of an order; a failure caused by one row names its product. */
export type OrderParsed =
  Parsed<SupplierOrderInput> | { ok: false; message: string; productId: string }

const rowFail = (product: OrderProduct, message: string): OrderParsed => ({
  ok: false,
  message: `${product.name}: ${message}`,
  productId: product.id,
})

/** Order form → server input: the rows with boxes of the chosen supplier. */
export function orderInputFromDraft(
  draft: OrderDraft,
  products: ReadonlyArray<OrderProduct>,
): OrderParsed {
  if (!draft.supplierId) return fail('Selecciona el proveedor.')
  if (!draft.warehouseId) return fail('Selecciona el almacén.')
  const lines: SupplierOrderInput['lines'] = []
  for (const product of products) {
    if (product.supplierId !== draft.supplierId) continue
    const boxes = parseBoxCount(draft.boxes[product.id] ?? '')
    if (!boxes.ok) return rowFail(product, boxes.message)
    if (boxes.value <= 0) continue
    if (rowOf(product, draft.boxes[product.id]).exceedsList) {
      return rowFail(product, NET_ABOVE_LIST_PRICE_MESSAGE)
    }
    lines.push({ productId: product.id, boxes: boxes.value })
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
