import { eq, inArray } from 'drizzle-orm'
import { AppError } from '#/lib/errors'
import { presentations, products } from '#/modules/catalog/db/schema'
import { resolveCustomerPrice } from '#/modules/customers/services/commercial-rules'
import type { CommercialRule } from '#/modules/customers/services/commercial-rules'
import { fitsInt4, MAX_INT4 } from '#/modules/inventory/services/stock-ledger'
import type { Tx } from '#/modules/inventory/services/stock-ledger'
import {
  fifoPlanner,
  lineListPrice,
  readSellableLots,
} from '#/modules/orders/services/order-allocation'
import type { LinePlan } from '#/modules/orders/services/order-allocation'
import { readWarehousePrices } from '#/modules/pricing/services/price-reads'

export type OrderLineInput = {
  presentationId: string
  /** Quantity in the presentation. */
  quantity: number
}
export type LineQuote = {
  productId: string
  productName: string
  presentationId: string
  quantity: number
  baseQuantity: number
  listPriceCents: number
  unitPriceCents: number
  lineTotalCents: number
  rule: CommercialRule | null
} & LinePlan

/** Checks quantities and duplicates before touching the database. */
export function validateLines(lines: Array<OrderLineInput>) {
  if (!lines.length) {
    throw new AppError('invalid', 'Agrega al menos un producto al pedido.')
  }
  for (const line of lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
      throw new AppError(
        'invalid',
        'La cantidad de cada producto debe ser un entero mayor que cero.',
      )
    }
    if (!fitsInt4(line.quantity)) throw tooLarge()
  }
  if (new Set(lines.map((l) => l.presentationId)).size !== lines.length) {
    throw new AppError(
      'invalid',
      'No repitas la misma presentación en el pedido.',
    )
  }
}

const tooLarge = () =>
  new AppError('invalid', 'La cantidad del pedido es demasiado grande.')

/**
 * Prices and plans every line inside the order's transaction. The product's
 * sellable lots are locked first and taken FIFO; a default-presentation line
 * is listed at the sale price of the oldest lot it takes (whole line), other
 * lines or lots without their own price at the standard warehouse price.
 * The customer's commercial rule applies on top. Callers authorize first.
 */
export async function quoteLines(
  tx: Tx,
  input: { warehouseId: string; customerId: string },
  lines: Array<OrderLineInput>,
): Promise<Array<LineQuote>> {
  const found = await tx
    .select({
      id: presentations.id,
      productId: presentations.productId,
      productName: products.name,
      factor: presentations.factor,
      active: presentations.active,
      isDefault: presentations.isDefault,
    })
    .from(presentations)
    .innerJoin(products, eq(products.id, presentations.productId))
    .where(
      inArray(
        presentations.id,
        lines.map((line) => line.presentationId),
      ),
    )
  const byId = new Map(found.map((row) => [row.id, row]))
  const prices = new Map(
    (await readWarehousePrices(tx, input.warehouseId)).map((row) => [
      row.presentationId,
      row.priceCents,
    ]),
  )
  const plan = fifoPlanner(
    await readSellableLots(
      tx,
      input.warehouseId,
      found.map((row) => row.productId),
      { lock: true },
    ),
  )
  const quotes: Array<LineQuote> = []
  let total = 0
  for (const line of lines) {
    const presentation = byId.get(line.presentationId)
    if (!presentation) {
      throw new AppError('not_found', 'No encontramos esa presentación.')
    }
    if (!presentation.active) {
      throw new AppError(
        'conflict',
        'Esa presentación no está disponible para la venta.',
      )
    }
    if (line.quantity > Math.floor(MAX_INT4 / presentation.factor)) {
      throw tooLarge()
    }
    const baseQuantity = line.quantity * presentation.factor
    const linePlan = plan(presentation.productId, baseQuantity)
    const listPriceCents = lineListPrice({
      isDefault: presentation.isDefault,
      firstLot: linePlan.firstLot,
      standardPriceCents: prices.get(line.presentationId),
    })
    if (listPriceCents == null) {
      throw new AppError(
        'conflict',
        'Este producto no tiene precio en este almacén.',
      )
    }
    const { unitPriceCents, rule } = await resolveCustomerPrice(
      {
        customerId: input.customerId,
        presentationId: line.presentationId,
        quantity: line.quantity,
        listPriceCents,
      },
      tx,
    )
    if (unitPriceCents < 1) {
      throw new AppError(
        'conflict',
        'El precio final de la línea debe ser mayor que cero.',
      )
    }
    const lineTotalCents = unitPriceCents * line.quantity
    total += lineTotalCents
    if (!fitsInt4(lineTotalCents) || !fitsInt4(total)) {
      throw new AppError('invalid', 'El total del pedido es demasiado grande.')
    }
    quotes.push({
      productId: presentation.productId,
      productName: presentation.productName,
      presentationId: line.presentationId,
      quantity: line.quantity,
      baseQuantity,
      listPriceCents,
      unitPriceCents,
      lineTotalCents,
      rule,
      ...linePlan,
    })
  }
  return quotes
}
