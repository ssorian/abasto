import { normalize } from '#/modules/inventory/lib/format'
import { parseBoxCount } from '#/modules/inventory/lib/box-count'
import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import {
  formatTenThousandths,
  netCostPerBoxCents,
  netCostPerPiece,
  parseTenThousandths,
} from '#/modules/inventory/lib/supplier-cost'
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

/** Order form state; boxes and list prices stay as typed text by product id. */
export type OrderDraft = {
  supplierId: string
  warehouseId: string
  expectedOn: string
  reference: string
  boxes: Readonly<Record<string, string | undefined>>
  /** List price per piece in pesos, up to 4 decimals. */
  prices: Readonly<Record<string, string | undefined>>
}

export const PRICE_BELOW_COST_MESSAGE =
  'El costo por caja supera el precio estándar. Actualiza el precio estándar del producto en el catálogo.'
export const NET_ABOVE_LIST_MESSAGE =
  'El descuento y la promoción no pueden superar el precio de lista.'

/** Pieces per box: the default active presentation, else 1. */
export const boxFactorOf = (product: OrderProduct) =>
  product.presentations.find((item) => item.isDefault && item.active)?.factor ??
  1

/** Net cost of one box in cents at a list price (same rule the server applies). */
export const costPerBoxOf = (product: OrderProduct, listPrice: number) =>
  netCostPerBoxCents(
    Math.max(
      netCostPerPiece(
        listPrice,
        product.fixedDiscountPerPiece,
        product.promotionPerPiece,
      ),
      0,
    ),
    boxFactorOf(product),
  )

const boxesOf = (text: string | undefined) => {
  const parsed = parseBoxCount(text ?? '')
  return parsed.ok ? parsed.value : 0
}

const priceOf = (text: string | undefined) => {
  const parsed = parseTenThousandths(text ?? '')
  return parsed.ok ? parsed.value : 0
}

/** Computed figures of a row from the typed text; unparsable fields count as zero. */
export function rowOf(
  product: OrderProduct,
  boxesText: string | undefined,
  priceText: string | undefined,
) {
  const boxes = boxesOf(boxesText)
  const listPrice = priceOf(priceText)
  const costPerBoxCents = costPerBoxOf(product, listPrice)
  return {
    boxes,
    listPrice,
    costPerBoxCents,
    totalCents: boxes * costPerBoxCents,
  }
}

/**
 * Non-blocking warnings of a row; `standardCents` is the box price in the
 * warehouse. Only rows being ordered warn.
 */
export function rowWarnings(
  row: { boxes: number; costPerBoxCents: number },
  standardCents: number | undefined,
): Array<string> {
  if (row.boxes <= 0) return []
  return standardCents === undefined || row.costPerBoxCents > standardCents
    ? [PRICE_BELOW_COST_MESSAGE]
    : []
}

/** Typed list prices from the last order line of each product. */
export function prefilledPrices(
  last: ReadonlyArray<{ productId: string; listPricePerPiece: number }>,
): Record<string, string> {
  return Object.fromEntries(
    last.map((row) => [
      row.productId,
      formatTenThousandths(row.listPricePerPiece),
    ]),
  )
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

/** Cost of the typed boxes at the typed list prices. */
export function orderTotalCents(
  products: ReadonlyArray<OrderProduct>,
  draft: Pick<OrderDraft, 'boxes' | 'prices'>,
): number {
  return products.reduce(
    (total, product) =>
      total +
      rowOf(product, draft.boxes[product.id], draft.prices[product.id])
        .totalCents,
    0,
  )
}

/** Order form → server input: rows with boxes of the chosen supplier and their list price. */
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
    const price = parseTenThousandths(draft.prices[product.id] ?? '')
    if (!price.ok) return fail(`${product.name}: ${price.message}`)
    if (
      netCostPerPiece(
        price.value,
        product.fixedDiscountPerPiece,
        product.promotionPerPiece,
      ) < 0
    ) {
      return fail(`${product.name}: ${NET_ABOVE_LIST_MESSAGE}`)
    }
    lines.push({
      productId: product.id,
      boxes: boxes.value,
      listPricePerPiece: price.value,
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
