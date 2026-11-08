import { inArray } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { resolveCustomerPrice } from '#/modules/customers/services/commercial-rules'
import type { CommercialRule } from '#/modules/customers/services/commercial-rules'
import { presentations } from '#/modules/catalog/db/schema'
import {
  fifoPlanner,
  lineListPrice,
  readSellableLots,
} from '#/modules/orders/services/order-allocation'
import { validateLines } from '#/modules/orders/services/order-quotes'
import type { OrderLineInput } from '#/modules/orders/services/order-quotes'
import { readWarehousePrices } from '#/modules/pricing/services/price-reads'

export type QuotePreviewLine = {
  presentationId: string
  quantity: number
  /** Null when the presentation has no price in this warehouse. */
  listPriceCents: number | null
  unitPriceCents: number | null
  lineTotalCents: number | null
  rule: CommercialRule | null
}
export type QuotePreview = {
  lines: Array<QuotePreviewLine>
  /** Sum of the lines that have a price. */
  totalCents: number
}

/**
 * Read-only mirror of the order quote: the oldest sellable lot's price (FIFO,
 * default presentation) or the standard warehouse price, then the customer's
 * rule through the same `resolveCustomerPrice` the order uses. Writes and
 * locks nothing and does not reject missing stock; `createOrder` stays the
 * authority.
 */
export async function previewQuote(
  actor: Actor,
  input: {
    warehouseId: string
    customerId: string
    lines: Array<OrderLineInput>
  },
): Promise<QuotePreview> {
  authorize(actor, 'warehouse.operate', input.warehouseId)
  return computeQuotePreview(input)
}

/** The read-only quote without authorization; callers authorize first. */
export async function computeQuotePreview(input: {
  warehouseId: string
  customerId: string
  lines: Array<OrderLineInput>
}): Promise<QuotePreview> {
  if (!input.lines.length) return { lines: [], totalCents: 0 }
  validateLines(input.lines)
  const prices = new Map(
    (await readWarehousePrices(db, input.warehouseId)).map((row) => [
      row.presentationId,
      row.priceCents,
    ]),
  )
  const found = await db
    .select({
      id: presentations.id,
      productId: presentations.productId,
      factor: presentations.factor,
      isDefault: presentations.isDefault,
    })
    .from(presentations)
    .where(
      inArray(
        presentations.id,
        input.lines.map((line) => line.presentationId),
      ),
    )
  const byId = new Map(found.map((row) => [row.id, row]))
  const plan = fifoPlanner(
    await readSellableLots(
      db,
      input.warehouseId,
      found.map((row) => row.productId),
      { lock: false },
    ),
  )
  const lines: Array<QuotePreviewLine> = []
  for (const line of input.lines) {
    const presentation = byId.get(line.presentationId)
    const listPriceCents = presentation
      ? lineListPrice({
          isDefault: presentation.isDefault,
          firstLot: plan(
            presentation.productId,
            line.quantity * presentation.factor,
          ).firstLot,
          standardPriceCents: prices.get(line.presentationId),
        })
      : null
    if (listPriceCents === null) {
      lines.push({
        ...line,
        listPriceCents: null,
        unitPriceCents: null,
        lineTotalCents: null,
        rule: null,
      })
      continue
    }
    const { unitPriceCents, rule } = await resolveCustomerPrice({
      customerId: input.customerId,
      presentationId: line.presentationId,
      quantity: line.quantity,
      listPriceCents,
    })
    const lineTotalCents = unitPriceCents * line.quantity
    if (lineTotalCents > Number.MAX_SAFE_INTEGER) {
      throw new AppError('invalid', 'El total del pedido es demasiado grande.')
    }
    lines.push({
      ...line,
      listPriceCents,
      unitPriceCents,
      lineTotalCents,
      rule,
    })
  }
  return {
    lines,
    totalCents: lines.reduce(
      (sum, line) => sum + (line.lineTotalCents ?? 0),
      0,
    ),
  }
}
