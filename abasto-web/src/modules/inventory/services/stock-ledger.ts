import { and, eq, gte, lte, sql } from 'drizzle-orm'
import type { db } from '#/db'
import { AppError } from '#/lib/errors'
import { products, suppliers } from '#/modules/catalog/db/schema'
import { productArchived } from '#/modules/catalog/services/product-reads'
import { lots, stockMovements } from '#/modules/inventory/db/schema'
import type { MovementType } from '#/modules/inventory/db/schema'
import { warehouses } from '#/modules/warehouses/db/schema'

/** Largest value of a Postgres `integer` column. */
export const MAX_INT4 = 2147483647

/** True for a whole number whose magnitude fits a Postgres `integer`. */
export const fitsInt4 = (value: number) =>
  Number.isSafeInteger(value) && Math.abs(value) <= MAX_INT4

/** An open database transaction. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
export type Lot = typeof lots.$inferSelect

export const insufficientStock = () =>
  new AppError('conflict', 'No hay suficiente existencia en ese lote.')

export const reservedUnits = () =>
  new AppError('conflict', 'Ese lote tiene unidades apartadas para pedidos.')

/** Locks the lot row until the transaction ends; serialises concurrent movements. */
export async function lockLot(tx: Tx, lotId: string): Promise<Lot> {
  const lot = (
    await tx.select().from(lots).where(eq(lots.id, lotId)).for('update')
  ).at(0)
  if (!lot) throw new AppError('not_found', 'No encontramos ese lote.')
  return lot
}

/**
 * Records a movement and applies it to the lot's cached `on_hand` in one
 * statement pair; refuses to take the lot below zero. A withdrawal may not
 * take units held by orders (`reserved`) unless it is the sale of that very
 * reservation (`fromReserved`), which lowers `on_hand` and `reserved` together.
 */
export async function appendMovement(
  tx: Tx,
  lot: Pick<Lot, 'id' | 'productId' | 'warehouseId'>,
  movement: {
    type: MovementType
    quantity: number
    reason: string
    reference?: string
    actorId: string
  },
  options: { fromReserved?: boolean } = {},
) {
  // bigint arithmetic so an overflow is a refusal, not a raw database error.
  const next = sql`${lots.onHand}::bigint + ${movement.quantity}::bigint`
  const nextReserved = options.fromReserved
    ? sql`${lots.reserved}::bigint + ${movement.quantity}::bigint`
    : sql`${lots.reserved}::bigint`
  const updated = (
    await tx
      .update(lots)
      .set({
        onHand: sql`${next}`,
        reserved: sql`${nextReserved}`,
      })
      .where(
        and(
          eq(lots.id, lot.id),
          gte(sql`${nextReserved}`, 0),
          gte(next, sql`${nextReserved}`),
          lte(next, MAX_INT4),
        ),
      )
      .returning({ id: lots.id })
  ).at(0)
  if (!updated) {
    if (movement.quantity > 0) {
      throw new AppError(
        'invalid',
        `La existencia del lote no puede ser mayor que ${MAX_INT4}.`,
      )
    }
    const current = (
      await tx
        .select({ onHand: lots.onHand })
        .from(lots)
        .where(eq(lots.id, lot.id))
    ).at(0)
    if (
      !options.fromReserved &&
      current &&
      current.onHand + movement.quantity >= 0
    ) {
      throw reservedUnits()
    }
    throw insufficientStock()
  }
  await tx.insert(stockMovements).values({
    lotId: lot.id,
    productId: lot.productId,
    warehouseId: lot.warehouseId,
    ...movement,
  })
}

export async function requireWarehouse(tx: Tx, id: string) {
  const found = (
    await tx
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(eq(warehouses.id, id))
  ).at(0)
  if (!found) throw new AppError('not_found', 'No encontramos ese almacén.')
}

export async function requireProduct(tx: Tx, id: string) {
  const found = (
    await tx
      .select({ id: products.id, archivedAt: products.archivedAt })
      .from(products)
      .where(eq(products.id, id))
  ).at(0)
  if (!found) throw new AppError('not_found', 'No encontramos ese producto.')
  if (found.archivedAt) throw productArchived()
}

export async function requireSupplier(tx: Tx, id: string) {
  const found = (
    await tx
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.id, id))
  ).at(0)
  if (!found) throw new AppError('not_found', 'No encontramos ese proveedor.')
}

export const isWholeNumber = (value: number) => Number.isSafeInteger(value)

/** Throws the Spanish "too large" refusal when a quantity or cents amount exceeds int4. */
export function assertFitsInt4(value: number, message: string) {
  if (Math.abs(value) > MAX_INT4) throw new AppError('invalid', message)
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  )
}

/** Earliest expiry first; lots without expiry last; ties by oldest received. */
export function byFefo(
  a: { expiresOn: string | null; receivedAt: Date },
  b: { expiresOn: string | null; receivedAt: Date },
) {
  if (a.expiresOn !== b.expiresOn) {
    if (!a.expiresOn) return 1
    if (!b.expiresOn) return -1
    return a.expiresOn < b.expiresOn ? -1 : 1
  }
  return a.receivedAt.getTime() - b.receivedAt.getTime()
}

/** Most recently received first; ties by later expiry (none = latest), then highest id. */
export function byNewest(
  a: { expiresOn: string | null; receivedAt: Date; id: string },
  b: { expiresOn: string | null; receivedAt: Date; id: string },
) {
  const received = b.receivedAt.getTime() - a.receivedAt.getTime()
  if (received) return received
  if (a.expiresOn !== b.expiresOn) {
    if (!a.expiresOn) return -1
    if (!b.expiresOn) return 1
    return a.expiresOn > b.expiresOn ? -1 : 1
  }
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}
