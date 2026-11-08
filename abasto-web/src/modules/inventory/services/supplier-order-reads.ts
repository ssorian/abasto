import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { products, suppliers } from '#/modules/catalog/db/schema'
import { purchaseLines, purchases } from '#/modules/inventory/db/schema'
import type { PurchaseStatus } from '#/modules/inventory/db/schema'
import { divideHalfUp } from '#/modules/inventory/lib/pending-value'
import { authorizeSupplierBalance } from '#/modules/inventory/services/supplier-balance'
import { requireSupplier } from '#/modules/inventory/services/stock-ledger'
import { requireWarehouse } from '#/modules/pricing/services/price-reads'

export const orderNotFound = () =>
  new AppError('not_found', 'No encontramos ese pedido.')

/** Queue row: one supplier order without its lines. */
export type SupplierOrderSummary = {
  id: string
  supplierId: string
  supplierName: string
  warehouseId: string
  status: PurchaseStatus
  reference: string
  purchasedOn: string
  expectedOn: string | null
  createdAt: Date
  receivedAt: Date | null
  lineCount: number
  totalCostCents: number
}

export async function listSupplierOrders(
  actor: Actor,
  input: { warehouseId: string; status?: PurchaseStatus },
): Promise<Array<SupplierOrderSummary>> {
  authorize(actor, 'warehouse.manage', input.warehouseId)
  await requireWarehouse(db, input.warehouseId)
  return db
    .select({
      id: purchases.id,
      supplierId: purchases.supplierId,
      supplierName: suppliers.name,
      warehouseId: purchases.warehouseId,
      status: purchases.status,
      reference: purchases.reference,
      purchasedOn: purchases.purchasedOn,
      expectedOn: purchases.expectedOn,
      createdAt: purchases.createdAt,
      receivedAt: purchases.receivedAt,
      lineCount: sql<number>`count(${purchaseLines.id})::int`,
      totalCostCents: sql<number>`coalesce(sum(${purchaseLines.totalCostCents}), 0)::int`,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(suppliers.id, purchases.supplierId))
    .leftJoin(purchaseLines, eq(purchaseLines.purchaseId, purchases.id))
    .where(
      and(
        eq(purchases.warehouseId, input.warehouseId),
        input.status ? eq(purchases.status, input.status) : undefined,
      ),
    )
    .groupBy(purchases.id, suppliers.name)
    .orderBy(desc(purchases.createdAt), asc(purchases.id))
}

export type SupplierOrderLine = {
  id: string
  productId: string
  productName: string
  sku: string
  boxFactor: number
  /** Ordered boxes. */
  boxes: number
  /** Ordered base units. */
  quantity: number
  /** Cost breakdown per piece (ten-thousandths of a peso) frozen with the order. */
  listPricePerPiece: number
  fixedDiscountPerPiece: number
  promotionPerPiece: number
  totalCostCents: number
  costPerBoxCents: number
  goodQuantity: number | null
  damagedQuantity: number | null
  /** Ordered − good − damaged; null until received. */
  missingQuantity: number | null
  lotCode: string
  expiresOn: string | null
}

export type SupplierOrder = Omit<
  SupplierOrderSummary,
  'supplierName' | 'lineCount' | 'totalCostCents'
> & {
  supplierName: string
  createdBy: string
  receivedBy: string | null
  lines: Array<SupplierOrderLine>
}

export async function getSupplierOrder(
  actor: Actor,
  purchaseId: string,
): Promise<SupplierOrder> {
  const order = (
    await db
      .select({
        id: purchases.id,
        supplierId: purchases.supplierId,
        supplierName: suppliers.name,
        warehouseId: purchases.warehouseId,
        status: purchases.status,
        reference: purchases.reference,
        purchasedOn: purchases.purchasedOn,
        expectedOn: purchases.expectedOn,
        createdAt: purchases.createdAt,
        createdBy: purchases.createdBy,
        receivedAt: purchases.receivedAt,
        receivedBy: purchases.receivedBy,
      })
      .from(purchases)
      .innerJoin(suppliers, eq(suppliers.id, purchases.supplierId))
      .where(eq(purchases.id, purchaseId))
  ).at(0)
  if (!order) throw orderNotFound()
  authorize(actor, 'warehouse.manage', order.warehouseId)
  const rows = await db
    .select({
      id: purchaseLines.id,
      productId: purchaseLines.productId,
      productName: products.name,
      sku: products.sku,
      boxFactor: purchaseLines.boxFactor,
      quantity: purchaseLines.quantity,
      listPricePerPiece: purchaseLines.listPricePerPiece,
      fixedDiscountPerPiece: purchaseLines.fixedDiscountPerPiece,
      promotionPerPiece: purchaseLines.promotionPerPiece,
      totalCostCents: purchaseLines.totalCostCents,
      goodQuantity: purchaseLines.goodQuantity,
      damagedQuantity: purchaseLines.damagedQuantity,
      lotCode: purchaseLines.lotCode,
      expiresOn: purchaseLines.expiresOn,
    })
    .from(purchaseLines)
    .innerJoin(products, eq(products.id, purchaseLines.productId))
    .where(eq(purchaseLines.purchaseId, purchaseId))
    .orderBy(asc(products.name), asc(products.sku), asc(purchaseLines.id))
  const lines = rows.map((row) => {
    const boxes = Math.floor(row.quantity / row.boxFactor)
    const received = row.goodQuantity !== null && row.damagedQuantity !== null
    return {
      ...row,
      boxes,
      costPerBoxCents: divideHalfUp(
        BigInt(row.totalCostCents),
        BigInt(Math.max(boxes, 1)),
      ),
      missingQuantity: received
        ? row.quantity - row.goodQuantity! - row.damagedQuantity!
        : null,
    }
  })
  return { ...order, lines }
}

export type LastSupplierCost = {
  productId: string
  /** Ten-thousandths of a peso. */
  listPricePerPiece: number
}

/**
 * The list price per piece of the most recent order line (by order creation)
 * of each product of a supplier, to prefill the next order. Products never
 * ordered are absent.
 */
export async function lastSupplierCosts(
  actor: Actor,
  supplierId: string,
): Promise<Array<LastSupplierCost>> {
  authorizeSupplierBalance(actor)
  return db.transaction(async (tx) => {
    await requireSupplier(tx, supplierId)
    return tx
      .selectDistinctOn([purchaseLines.productId], {
        productId: purchaseLines.productId,
        listPricePerPiece: purchaseLines.listPricePerPiece,
      })
      .from(purchaseLines)
      .innerJoin(purchases, eq(purchases.id, purchaseLines.purchaseId))
      .innerJoin(products, eq(products.id, purchaseLines.productId))
      .where(eq(products.supplierId, supplierId))
      .orderBy(
        asc(purchaseLines.productId),
        desc(purchases.createdAt),
        desc(purchaseLines.id),
      )
  })
}
