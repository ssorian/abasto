import { and, desc, eq, gt, sql } from 'drizzle-orm'
import { db } from '#/db'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { user } from '#/db/auth-schema'
import { products } from '#/modules/catalog/db/schema'
import {
  lots,
  stockMinimums,
  stockMovements,
} from '#/modules/inventory/db/schema'
import type { MovementType } from '#/modules/inventory/db/schema'
import { businessDate } from '#/modules/orders/services/clock'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'
import { byFefo } from '#/modules/inventory/services/stock-ledger'
import {
  riderAllocations,
  riderAssignmentLines,
  riderAssignments,
} from '#/modules/riders/db/schema'

export type StockLot = {
  id: string
  code: string
  expiresOn: string | null
  receivedAt: Date
  onHand: number
}
export type ProductStock = {
  productId: string
  name: string
  sku: string
  unit: string
  /** Catalog photo; null when the product has none. */
  imageUrl: string | null
  onHand: number
  /** Held by open orders (Reservado or Preparado). */
  reserved: number
  /** Handed to riders on open assignments (En ruta); still on hand until settled. */
  inRoute: number
  /** Units in lots past their expiry day; never sold, not in `available`. */
  expired: number
  available: number
  minimum: number
  belowMinimum: boolean
  /** Lots with stock, earliest expiry first (no expiry last). */
  lots: Array<StockLot>
}

/**
 * Stock per product in one warehouse: every published product (zero stock
 * included) plus any product that has lots or a minimum. Overdue orders expire first (so their units are not counted as
 * reserved); `available` leaves out reserved and past-expiry units.
 */
export async function getWarehouseStock(
  actor: Actor,
  warehouseId: string,
): Promise<Array<ProductStock>> {
  authorize(actor, 'warehouse.view', warehouseId)
  const today = businessDate()
  const stock = await db.transaction(async (tx) => {
    await expireOverdueOrders(tx, warehouseId)
    // One transaction client runs one query at a time: await in sequence.
    const lotList = await tx
      .select({
        productId: lots.productId,
        id: lots.id,
        code: lots.code,
        expiresOn: lots.expiresOn,
        receivedAt: lots.receivedAt,
        onHand: lots.onHand,
        reserved: lots.reserved,
      })
      .from(lots)
      .where(and(eq(lots.warehouseId, warehouseId), gt(lots.onHand, 0)))
    const minimums = await tx
      .select()
      .from(stockMinimums)
      .where(eq(stockMinimums.warehouseId, warehouseId))
    // Rider units also sit in `lots.reserved`; split them out of order holds.
    const routes = await tx
      .select({
        productId: riderAssignmentLines.productId,
        quantity: sql<number>`sum(${riderAllocations.quantity})::int`,
      })
      .from(riderAllocations)
      .innerJoin(
        riderAssignmentLines,
        eq(riderAssignmentLines.id, riderAllocations.lineId),
      )
      .innerJoin(
        riderAssignments,
        eq(riderAssignments.id, riderAssignmentLines.assignmentId),
      )
      .where(
        and(
          eq(riderAssignments.warehouseId, warehouseId),
          eq(riderAssignments.status, 'En ruta'),
        ),
      )
      .groupBy(riderAssignmentLines.productId)
    return { lotRows: lotList, minimumRows: minimums, routeRows: routes }
  })
  const { lotRows, minimumRows, routeRows } = stock
  const productIds = new Set([
    ...lotRows.map((row) => row.productId),
    ...minimumRows.map((row) => row.productId),
  ])
  // Published products always show, even before their first lot or minimum.
  const catalog = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      unit: products.unit,
      imageUrl: products.imageUrl,
      published: products.published,
    })
    .from(products)
  return catalog
    .filter((product) => product.published || productIds.has(product.id))
    .map((product) => {
      const productRows = lotRows.filter((row) => row.productId === product.id)
      const productLots = productRows
        .map(({ productId: _productId, reserved: _reserved, ...lot }) => lot)
        .sort(byFefo)
      const onHand = productLots.reduce((sum, lot) => sum + lot.onHand, 0)
      const minimum =
        minimumRows.find((row) => row.productId === product.id)?.minimum ?? 0
      const inRoute =
        routeRows.find((row) => row.productId === product.id)?.quantity ?? 0
      const reserved =
        productRows.reduce((sum, row) => sum + row.reserved, 0) - inRoute
      const isExpired = (row: (typeof productRows)[number]) =>
        row.expiresOn !== null && row.expiresOn < today
      const expired = productRows
        .filter(isExpired)
        .reduce((sum, row) => sum + row.onHand, 0)
      const available = productRows
        .filter((row) => !isExpired(row))
        .reduce((sum, row) => sum + row.onHand - row.reserved, 0)
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        imageUrl: product.imageUrl,
        onHand,
        reserved,
        inRoute,
        expired,
        available,
        minimum,
        belowMinimum: minimum > 0 && available < minimum,
        lots: productLots,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export type StockMovementRow = {
  id: string
  type: MovementType
  /** Signed base units. */
  quantity: number
  reason: string
  reference: string | null
  actorName: string
  lotId: string
  lotCode: string
  createdAt: Date
}

/** Ledger entries of one warehouse, newest first; optionally for one product or lot. */
export async function listStockMovements(
  actor: Actor,
  input: {
    warehouseId: string
    productId?: string
    lotId?: string
    limit?: number
  },
): Promise<Array<StockMovementRow>> {
  authorize(actor, 'warehouse.view', input.warehouseId)
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 100), 1), 500)
  return db
    .select({
      id: stockMovements.id,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      reason: stockMovements.reason,
      reference: stockMovements.reference,
      actorName: user.name,
      lotId: stockMovements.lotId,
      lotCode: lots.code,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(lots, eq(lots.id, stockMovements.lotId))
    .innerJoin(user, eq(user.id, stockMovements.actorId))
    .where(
      and(
        eq(stockMovements.warehouseId, input.warehouseId),
        input.productId
          ? eq(stockMovements.productId, input.productId)
          : undefined,
        input.lotId ? eq(stockMovements.lotId, input.lotId) : undefined,
      ),
    )
    .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
    .limit(limit)
}
