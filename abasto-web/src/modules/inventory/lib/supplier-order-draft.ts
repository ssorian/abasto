import {
  listPricePerPieceOf,
  netLineCents,
  netPerBoxOfLineCents,
} from '#/lib/utils/supplier-cost'
import { parseBoxCount } from '#/modules/inventory/lib/box-count'
import { parsePesosToCents } from '#/modules/inventory/lib/cents'
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
  /** Supplier discount and promotion per piece, in ten-thousandths of a peso. */
  fixedDiscountPerPiece: number
  promotionPerPiece: number
  presentations: ReadonlyArray<PresentationLike>
}

/** Order form state; boxes and gross costs stay as typed text by product id. */
export type OrderDraft = {
  supplierId: string
  warehouseId: string
  expectedOn: string
  reference: string
  boxes: Readonly<Record<string, string | undefined>>
  /** Line cost before discounts in pesos, up to 2 decimals. */
  costs: Readonly<Record<string, string | undefined>>
}

export const PRICE_BELOW_COST_MESSAGE =
  'El costo por caja supera el precio estándar. Actualiza el precio estándar del producto en el catálogo.'
export const NET_ABOVE_GROSS_MESSAGE =
  'El descuento y la promoción no pueden superar el costo antes de descuentos.'

/** Pieces per box: the default presentation, active or not (the server's rule), else 1. */
export const boxFactorOf = (product: OrderProduct) =>
  product.presentations.find((item) => item.isDefault)?.factor ?? 1

const boxesOf = (text: string | undefined) => {
  const parsed = parseBoxCount(text ?? '')
  return parsed.ok ? parsed.value : 0
}

/** Pesos typed with up to 2 decimals → cents; blank means zero. */
const parseGrossCents = (text: string | undefined): Parsed<number> =>
  (text ?? '').trim() === ''
    ? { ok: true, value: 0 }
    : parsePesosToCents(text ?? '', { allowZero: true })

const grossOf = (text: string | undefined) => {
  const parsed = parseGrossCents(text)
  return parsed.ok ? parsed.value : 0
}

/**
 * Figures of a row from the typed text (same rules as the server); unparsable
 * fields count as zero, and rows without boxes cost nothing. `exceedsGross` marks discounts above the gross cost;
 * the net figures then show zero instead of a negative cost.
 */
export function rowOf(
  product: OrderProduct,
  boxesText: string | undefined,
  costText: string | undefined,
) {
  const boxes = boxesOf(boxesText)
  const grossCents = grossOf(costText)
  const quantity = boxes * boxFactorOf(product)
  // A row without boxes is not ordered: its typed cost counts for nothing.
  const net =
    boxes > 0
      ? netLineCents(
          grossCents,
          quantity,
          product.fixedDiscountPerPiece,
          product.promotionPerPiece,
        )
      : 0
  const exceedsGross = net < 0
  const netCents = Math.max(net, 0)
  return {
    boxes,
    grossCents,
    listPrice: listPricePerPieceOf(grossCents, quantity),
    netLineCents: netCents,
    netPerBoxCents: netPerBoxOfLineCents(netCents, boxes),
    exceedsGross,
  }
}

/**
 * Non-blocking warnings of a row; `standardCents` is the box price in the
 * warehouse. Only rows being ordered warn.
 */
export function rowWarnings(
  row: { boxes: number; netPerBoxCents: number },
  standardCents: number | undefined,
): Array<string> {
  if (row.boxes <= 0) return []
  return standardCents === undefined || row.netPerBoxCents > standardCents
    ? [PRICE_BELOW_COST_MESSAGE]
    : []
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
  draft: Pick<OrderDraft, 'boxes' | 'costs'>,
): number {
  return products.reduce(
    (total, product) =>
      total +
      rowOf(product, draft.boxes[product.id], draft.costs[product.id])
        .netLineCents,
    0,
  )
}

/** Order form → server input: rows with boxes of the chosen supplier and their gross cost. */
export function orderInputFromDraft(
  draft: OrderDraft,
  products: ReadonlyArray<OrderProduct>,
): Parsed<SupplierOrderInput> {
  if (!draft.supplierId) return fail('Selecciona el proveedor.')
  if (!draft.warehouseId) return fail('Selecciona el almacén.')
  const lines: SupplierOrderInput['lines'] = []
  for (const product of products) {
    if (product.supplierId !== draft.supplierId) continue
    const boxes = parseBoxCount(draft.boxes[product.id] ?? '')
    if (!boxes.ok) return fail(`${product.name}: ${boxes.message}`)
    if (boxes.value <= 0) continue
    const gross = parseGrossCents(draft.costs[product.id])
    if (!gross.ok) return fail(`${product.name}: ${gross.message}`)
    if (
      rowOf(product, draft.boxes[product.id], draft.costs[product.id])
        .exceedsGross
    ) {
      return fail(`${product.name}: ${NET_ABOVE_GROSS_MESSAGE}`)
    }
    lines.push({
      productId: product.id,
      boxes: boxes.value,
      grossCostCents: gross.value,
    })
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
