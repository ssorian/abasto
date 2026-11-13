import { and, asc, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { presentations, products } from '#/modules/catalog/db/schema'
import { presentationPrices } from '#/modules/pricing/db/schema'
import { warehouses } from '#/modules/warehouses/db/schema'

/** A database or an open transaction. */
export type Executor = Pick<typeof db, 'select' | 'selectDistinctOn'>

export type PriceOrigin = 'own' | 'none'
export type PriceRow = {
  productId: string
  productName: string
  sku: string
  category: string
  presentationId: string
  presentationName: string
  factor: number
  isDefault: boolean
  /** Null when the presentation has no price in this warehouse. */
  priceCents: number | null
  origin: PriceOrigin
}

export const priceKey = (warehouseId: string, presentationId: string) =>
  `${warehouseId}:${presentationId}`

/** Integer division rounded to the nearest unit (halves up); positive operands. */
export const roundDiv = (numerator: bigint, denominator: bigint) =>
  Number((2n * numerator + denominator) / (2n * denominator))

export async function requireWarehouse(executor: Executor, id: string) {
  const found = (
    await executor
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(eq(warehouses.id, id))
  ).at(0)
  if (!found) throw new AppError('not_found', 'No encontramos ese almacén.')
}

/** Own current price (latest row already in effect) per warehouse and presentation. */
export async function currentOwnPrices(
  executor: Executor,
  warehouseIds: Array<string>,
  presentationIds?: Array<string>,
): Promise<Map<string, number>> {
  if (!warehouseIds.length || presentationIds?.length === 0) return new Map()
  const rows = await executor
    .selectDistinctOn([
      presentationPrices.warehouseId,
      presentationPrices.presentationId,
    ])
    .from(presentationPrices)
    .where(
      and(
        inArray(presentationPrices.warehouseId, warehouseIds),
        presentationIds
          ? inArray(presentationPrices.presentationId, presentationIds)
          : undefined,
        // Prices committed after this transaction began are current too.
        lte(presentationPrices.effectiveFrom, sql`clock_timestamp()`),
      ),
    )
    .orderBy(
      presentationPrices.warehouseId,
      presentationPrices.presentationId,
      desc(presentationPrices.effectiveFrom),
      desc(presentationPrices.createdAt),
    )
  return new Map(
    rows.map((row) => [
      priceKey(row.warehouseId, row.presentationId),
      row.priceCents,
    ]),
  )
}

/**
 * Current prices of every active presentation in a warehouse. Each
 * presentation has its own price; one without it has none and is not sold.
 */
export async function listWarehousePrices(
  actor: Actor,
  warehouseId: string,
  executor: Executor = db,
): Promise<Array<PriceRow>> {
  authorize(actor, 'warehouse.view', warehouseId)
  return readWarehousePrices(executor, warehouseId, { archived: false })
}

/** Same as `listWarehousePrices` without authorization; callers authorize first. */
export async function readWarehousePrices(
  executor: Executor,
  warehouseId: string,
  { archived = true }: { archived?: boolean } = {},
): Promise<Array<PriceRow>> {
  await requireWarehouse(executor, warehouseId)
  const items = await executor
    .select({
      productId: products.id,
      productName: products.name,
      sku: products.sku,
      category: products.category,
      presentationId: presentations.id,
      presentationName: presentations.name,
      factor: presentations.factor,
      isDefault: presentations.isDefault,
      active: presentations.active,
    })
    .from(presentations)
    .innerJoin(products, eq(products.id, presentations.productId))
    .where(archived ? undefined : isNull(products.archivedAt))
    .orderBy(
      asc(products.name),
      asc(products.sku),
      asc(presentations.factor),
      asc(presentations.name),
    )
  const own = await currentOwnPrices(executor, [warehouseId])
  return items
    .filter((item) => item.active)
    .map(({ active: _active, ...item }) => {
      const ownPrice = own.get(priceKey(warehouseId, item.presentationId))
      return ownPrice === undefined
        ? { ...item, priceCents: null, origin: 'none' as const }
        : { ...item, priceCents: ownPrice, origin: 'own' as const }
    })
}

/** Every price ever set for a presentation in a warehouse, newest first. */
export async function getPriceHistory(
  actor: Actor,
  input: { warehouseId: string; presentationId: string },
  executor: Executor = db,
) {
  authorize(actor, 'warehouse.view', input.warehouseId)
  await requireWarehouse(executor, input.warehouseId)
  const known = await executor
    .select({ id: presentations.id })
    .from(presentations)
    .where(eq(presentations.id, input.presentationId))
  if (!known.length) {
    throw new AppError('not_found', 'No encontramos esa presentación.')
  }
  return executor
    .select()
    .from(presentationPrices)
    .where(
      and(
        eq(presentationPrices.warehouseId, input.warehouseId),
        eq(presentationPrices.presentationId, input.presentationId),
      ),
    )
    .orderBy(
      desc(presentationPrices.effectiveFrom),
      desc(presentationPrices.createdAt),
    )
}
