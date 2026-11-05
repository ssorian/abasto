import { and, asc, eq, gt, gte, inArray, isNull, or, sql } from 'drizzle-orm'
import { AppError } from '#/lib/errors'
import { lots } from '#/modules/inventory/db/schema'
import { byFefo } from '#/modules/inventory/services/stock-ledger'
import type { Tx } from '#/modules/inventory/services/stock-ledger'
import { businessDate } from '#/modules/orders/services/clock'
import type { LineQuote } from '#/modules/orders/services/order-quotes'

export type LineAllocation = Array<{ lotId: string; quantity: number }>

/**
 * Reserves the quoted base units FEFO across lots. Every lot with available
 * units of the products is row-locked in id order (the order every order
 * operation uses, so concurrent orders cannot deadlock), then `reserved` is
 * raised. Returns the allocations per quote, in the same order.
 */
export async function allocateFefo(
  tx: Tx,
  warehouseId: string,
  quotes: Array<LineQuote>,
): Promise<Array<LineAllocation>> {
  const locked = await tx
    .select()
    .from(lots)
    .where(
      and(
        eq(lots.warehouseId, warehouseId),
        inArray(lots.productId, [...new Set(quotes.map((q) => q.productId))]),
        gt(lots.onHand, lots.reserved),
        // Past-expiry lots are never sold; a lot expiring today still is.
        or(isNull(lots.expiresOn), gte(lots.expiresOn, businessDate())),
      ),
    )
    .orderBy(asc(lots.id))
    .for('update')
  const free = new Map(locked.map((lot) => [lot.id, lot.onHand - lot.reserved]))
  const taken = new Map<string, number>()
  const result: Array<LineAllocation> = []
  for (const quote of quotes) {
    let remaining = quote.baseQuantity
    const allocation: LineAllocation = []
    const candidates = locked
      .filter((lot) => lot.productId === quote.productId)
      .sort((a, b) => byFefo(a, b) || (a.id < b.id ? -1 : 1))
    for (const lot of candidates) {
      if (!remaining) break
      const take = Math.min(free.get(lot.id) ?? 0, remaining)
      if (!take) continue
      free.set(lot.id, (free.get(lot.id) ?? 0) - take)
      taken.set(lot.id, (taken.get(lot.id) ?? 0) + take)
      allocation.push({ lotId: lot.id, quantity: take })
      remaining -= take
    }
    if (remaining) {
      throw new AppError(
        'conflict',
        `No hay suficiente existencia disponible de ${quote.productName}.`,
      )
    }
    result.push(allocation)
  }
  for (const [lotId, quantity] of taken) {
    await tx
      .update(lots)
      .set({ reserved: sql`${lots.reserved} + ${quantity}` })
      .where(eq(lots.id, lotId))
  }
  return result
}
