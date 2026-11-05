import { and, desc, eq, gt } from 'drizzle-orm'
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
import { byFefo } from '#/modules/inventory/services/stock-ledger'

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
  onHand: number
  /** Held by open orders (Reservado or Preparado). */
  reserved: number
  available: number
  minimum: number
  belowMinimum: boolean
  /** Lots with stock, earliest expiry first (no expiry last). */
  lots: Array<StockLot>
}

/** Stock per product in one warehouse, including products that only have a minimum. */
export async function getWarehouseStock(
  actor: Actor,
  warehouseId: string,
): Promise<Array<ProductStock>> {
  authorize(actor, 'warehouse.view', warehouseId)
  const [lotRows, minimumRows] = await Promise.all([
    db
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
      .where(and(eq(lots.warehouseId, warehouseId), gt(lots.onHand, 0))),
    db
      .select()
      .from(stockMinimums)
      .where(eq(stockMinimums.warehouseId, warehouseId)),
  ])
  const productIds = new Set([
    ...lotRows.map((row) => row.productId),
    ...minimumRows.map((row) => row.productId),
  ])
  if (!productIds.size) return []
  const catalog = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      unit: products.unit,
    })
    .from(products)
  return catalog
    .filter((product) => productIds.has(product.id))
    .map((product) => {
      const productRows = lotRows.filter((row) => row.productId === product.id)
      const productLots = productRows
        .map(({ productId: _productId, reserved: _reserved, ...lot }) => lot)
        .sort(byFefo)
      const onHand = productLots.reduce((sum, lot) => sum + lot.onHand, 0)
      const minimum =
        minimumRows.find((row) => row.productId === product.id)?.minimum ?? 0
      const reserved = productRows.reduce((sum, row) => sum + row.reserved, 0)
      const available = onHand - reserved
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        onHand,
        reserved,
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
