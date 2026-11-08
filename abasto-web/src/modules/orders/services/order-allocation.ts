import { and, asc, eq, gt, gte, inArray, isNull, or, sql } from 'drizzle-orm'
import type { db } from '#/db'
import { AppError } from '#/lib/errors'
import { lots } from '#/modules/inventory/db/schema'
import type { Lot, Tx } from '#/modules/inventory/services/stock-ledger'
import { businessDate } from '#/modules/orders/services/clock'

export type LineAllocation = Array<{ lotId: string; quantity: number }>
export type SellableLot = Pick<
  Lot,
  'id' | 'productId' | 'receivedAt' | 'onHand' | 'reserved' | 'salePriceCents'
>

/** Oldest received first; ties by id so the order is total. */
export function byFifo(
  a: { receivedAt: Date; id: string },
  b: { receivedAt: Date; id: string },
) {
  return (
    a.receivedAt.getTime() - b.receivedAt.getTime() ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  )
}

/**
 * Lots of the products with available units that may still be sold, FIFO.
 * With `lock`, rows are locked in id order (the order every order operation
 * uses, so concurrent orders cannot deadlock).
 */
export async function readSellableLots(
  executor: Tx | typeof db,
  warehouseId: string,
  productIds: Array<string>,
  { lock }: { lock: boolean },
): Promise<Array<SellableLot>> {
  if (!productIds.length) return []
  const query = executor
    .select({
      id: lots.id,
      productId: lots.productId,
      receivedAt: lots.receivedAt,
      onHand: lots.onHand,
      reserved: lots.reserved,
      salePriceCents: lots.salePriceCents,
    })
    .from(lots)
    .where(
      and(
        eq(lots.warehouseId, warehouseId),
        inArray(lots.productId, [...new Set(productIds)]),
        gt(lots.onHand, lots.reserved),
        // Past-expiry lots are never sold; a lot expiring today still is.
        or(isNull(lots.expiresOn), gte(lots.expiresOn, businessDate())),
      ),
    )
    .orderBy(asc(lots.id))
  const rows = lock ? await query.for('update') : await query
  return rows.sort(byFifo)
}

export type LinePlan = {
  allocation: LineAllocation
  /** Base units no lot could cover. */
  missing: number
  /** Oldest lot the line takes; it sets the line price. */
  firstLot: SellableLot | null
}

/**
 * Plans lines FIFO over the same lots, line after line: a later line of the
 * same product starts where the earlier one left off. Writes nothing.
 */
export function fifoPlanner(sellable: Array<SellableLot>) {
  const free = new Map(
    sellable.map((lot) => [lot.id, lot.onHand - lot.reserved]),
  )
  return (productId: string, baseQuantity: number): LinePlan => {
    let remaining = baseQuantity
    const allocation: LineAllocation = []
    let firstLot: SellableLot | null = null
    for (const lot of sellable) {
      if (!remaining) break
      if (lot.productId !== productId) continue
      const take = Math.min(free.get(lot.id) ?? 0, remaining)
      if (!take) continue
      free.set(lot.id, (free.get(lot.id) ?? 0) - take)
      firstLot ??= lot
      allocation.push({ lotId: lot.id, quantity: take })
      remaining -= take
    }
    return { allocation, missing: remaining, firstLot }
  }
}

/**
 * Reserves the planned allocations of the quoted lines (lots already locked by
 * the quote) or rejects the first line no stock covers.
 */
export async function reserveAllocations(
  tx: Tx,
  lines: Array<{ productName: string } & LinePlan>,
): Promise<Array<LineAllocation>> {
  const short = lines.find((line) => line.missing > 0)
  if (short) {
    throw new AppError(
      'conflict',
      `No hay suficiente existencia disponible de ${short.productName}.`,
    )
  }
  const taken = new Map<string, number>()
  for (const line of lines) {
    for (const { lotId, quantity } of line.allocation) {
      taken.set(lotId, (taken.get(lotId) ?? 0) + quantity)
    }
  }
  for (const [lotId, quantity] of taken) {
    await tx
      .update(lots)
      .set({ reserved: sql`${lots.reserved} + ${quantity}` })
      .where(eq(lots.id, lotId))
  }
  return lines.map((line) => line.allocation)
}

/** List price of a line: the oldest lot's own price for the default presentation, else the standard. */
export function lineListPrice(input: {
  isDefault: boolean
  firstLot: SellableLot | null
  standardPriceCents: number | null | undefined
}): number | null {
  const lotPrice = input.isDefault ? input.firstLot?.salePriceCents : null
  return lotPrice ?? input.standardPriceCents ?? null
}
