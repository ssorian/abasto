import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { products, suppliers } from '#/modules/catalog/db/schema'
import {
  purchaseLines,
  purchases,
  supplierPendings,
} from '#/modules/inventory/db/schema'
import type { PurchaseStatus } from '#/modules/inventory/db/schema'
import { orderCode } from '#/modules/inventory/lib/order-code'
import { divideHalfUp } from '#/modules/inventory/lib/pending-value'
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
  /** Sequential order number. */
  folio: number
  /** Lot code of everything this order receives: the reference, else `PED-0001`. */
  code: string
  purchasedOn: string
  expectedOn: string | null
  createdAt: Date
  receivedAt: Date | null
  lineCount: number
  /** Net total of the lines (after the supplier's own discounts and promotions). */
  totalCostCents: number
  /** "Por reponer" balances discounted on this order, in cents. */
  discountCents: number
  /** Net total − discounts: what is paid. */
  payableCents: number
  /** Received orders: base units that did not arrive, and their value in cents. */
  missingQuantity: number
  missingValueCents: number
  /** Received orders: base units that arrived damaged, and their value in cents. */
  damagedQuantity: number
  damagedValueCents: number
}

const noShortages = {
  missingQuantity: 0,
  missingValueCents: 0,
  damagedQuantity: 0,
  damagedValueCents: 0,
}

type Shortages = typeof noShortages

const withCode = <
  T extends {
    reference: string
    folio: number
    totalCostCents: number
    discountCents: number
  },
>(
  row: T,
) => ({
  ...row,
  code: orderCode(row),
  payableCents: row.totalCostCents - row.discountCents,
})

export async function listSupplierOrders(
  actor: Actor,
  input: { warehouseId: string; status?: PurchaseStatus },
): Promise<Array<SupplierOrderSummary>> {
  authorize(actor, 'warehouse.manage', input.warehouseId)
  await requireWarehouse(db, input.warehouseId)
  const rows = await db
    .select({
      id: purchases.id,
      supplierId: purchases.supplierId,
      supplierName: suppliers.name,
      warehouseId: purchases.warehouseId,
      status: purchases.status,
      reference: purchases.reference,
      folio: purchases.folio,
      purchasedOn: purchases.purchasedOn,
      expectedOn: purchases.expectedOn,
      createdAt: purchases.createdAt,
      receivedAt: purchases.receivedAt,
      discountCents: purchases.discountCents,
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
  const shortages = await shortagesByOrder(rows.map((row) => row.id))
  return rows.map((row) =>
    withCode({ ...row, ...(shortages.get(row.id) ?? noShortages) }),
  )
}

/** Missing and damaged units of received orders, from the balances created at reception. */
async function shortagesByOrder(purchaseIds: Array<string>) {
  const result = new Map<string, Shortages>()
  if (!purchaseIds.length) return result
  const rows = await db
    .select({
      purchaseId: supplierPendings.purchaseId,
      type: supplierPendings.type,
      quantity: sql<number>`sum(${supplierPendings.quantity})::int`,
      valueCents: sql<number>`sum(${supplierPendings.valueCents})::int`,
    })
    .from(supplierPendings)
    .where(
      and(
        inArray(supplierPendings.purchaseId, purchaseIds),
        inArray(supplierPendings.type, ['missing', 'damaged']),
      ),
    )
    .groupBy(supplierPendings.purchaseId, supplierPendings.type)
  for (const row of rows) {
    const current = result.get(row.purchaseId!) ?? { ...noShortages }
    if (row.type === 'missing') {
      current.missingQuantity = row.quantity
      current.missingValueCents = row.valueCents
    } else {
      current.damagedQuantity = row.quantity
      current.damagedValueCents = row.valueCents
    }
    result.set(row.purchaseId!, current)
  }
  return result
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
  /** Quantity × list price in cents, before the fixed discount and promotion. */
  grossCostCents: number
  /** Price, discount and promotion per piece (ten-thousandths) frozen with the order. */
  listPricePerPiece: number
  fixedDiscountPerPiece: number
  promotionPerPiece: number
  /** List price per piece when ordered; differs when reception corrected it. Null if never ordered. */
  orderedListPricePerPiece: number | null
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
  'lineCount' | keyof Shortages
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
        folio: purchases.folio,
        discountCents: purchases.discountCents,
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
      grossCostCents: purchaseLines.grossCostCents,
      listPricePerPiece: purchaseLines.listPricePerPiece,
      orderedListPricePerPiece: purchaseLines.orderedListPricePerPiece,
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
  const totalCostCents = lines.reduce(
    (sum, line) => sum + line.totalCostCents,
    0,
  )
  return { ...withCode({ ...order, totalCostCents }), lines }
}
