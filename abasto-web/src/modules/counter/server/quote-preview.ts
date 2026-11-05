import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { resolveCustomerPrice } from '#/modules/customers/services/commercial-rules'
import type { CommercialRule } from '#/modules/customers/services/commercial-rules'
import { validateLines } from '#/modules/orders/services/order-quotes'
import type { OrderLineInput } from '#/modules/orders/services/order-quotes'
import { listWarehousePrices } from '#/modules/pricing/services/price-reads'

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
 * Read-only mirror of the order quote: current warehouse price, then the
 * customer's rule through the same `resolveCustomerPrice` the order uses.
 * Writes nothing and does not check stock; `createOrder` stays the authority.
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
  if (!input.lines.length) return { lines: [], totalCents: 0 }
  validateLines(input.lines)
  const prices = new Map(
    (await listWarehousePrices(actor, input.warehouseId)).map((row) => [
      row.presentationId,
      row.priceCents,
    ]),
  )
  const lines: Array<QuotePreviewLine> = []
  for (const line of input.lines) {
    const listPriceCents = prices.get(line.presentationId) ?? null
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
