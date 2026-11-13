import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { presentations, products } from '#/modules/catalog/db/schema'
import { customers } from '#/modules/customers/db/schema'
import { lots } from '#/modules/inventory/db/schema'
import { requireWarehouse } from '#/modules/inventory/services/stock-ledger'
import {
  orderAllocations,
  orderLines,
  orders,
} from '#/modules/orders/db/schema'
import type { OrderStatus } from '#/modules/orders/db/schema'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'

type Executor = Pick<typeof db, 'select'>

export type OrderSummary = {
  id: string
  warehouseId: string
  customerId: string
  customerName: string
  status: OrderStatus
  totalCents: number
  createdAt: Date
  expiresAt: Date
}
export type OrderLineDetail = {
  id: string
  productId: string
  productName: string
  presentationId: string
  presentationName: string
  factor: number
  /** Quantity in the presentation. */
  quantity: number
  baseQuantity: number
  listPriceCents: number
  unitPriceCents: number
  lineTotalCents: number
  /** Commercial rule applied when the order was placed. */
  rule: {
    minQuantity: number
    discountBps: number | null
    priceCents: number | null
  } | null
  allocations: Array<{
    lotId: string
    lotCode: string
    expiresOn: string | null
    quantity: number
  }>
}
export type OrderDetail = OrderSummary & {
  notes: string
  createdBy: string
  closedAt: Date | null
  lines: Array<OrderLineDetail>
}

export const orderNotFound = () =>
  new AppError('not_found', 'No encontramos ese pedido.')

const summaryColumns = {
  id: orders.id,
  warehouseId: orders.warehouseId,
  customerId: orders.customerId,
  customerName: customers.name,
  status: orders.status,
  totalCents: orders.totalCents,
  createdAt: orders.createdAt,
  expiresAt: orders.expiresAt,
}

/** Reads one order with its lines and allocations; works inside a transaction. */
export async function readOrder(
  executor: Executor,
  orderId: string,
): Promise<OrderDetail> {
  const order = (
    await executor
      .select({
        ...summaryColumns,
        notes: orders.notes,
        createdBy: orders.createdBy,
        closedAt: orders.closedAt,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(orders.id, orderId))
  ).at(0)
  if (!order) throw orderNotFound()
  const lineRows = await executor
    .select({
      id: orderLines.id,
      productId: orderLines.productId,
      productName: products.name,
      presentationId: orderLines.presentationId,
      presentationName: presentations.name,
      factor: presentations.factor,
      quantity: orderLines.quantity,
      baseQuantity: orderLines.baseQuantity,
      listPriceCents: orderLines.listPriceCents,
      unitPriceCents: orderLines.unitPriceCents,
      lineTotalCents: orderLines.lineTotalCents,
      ruleMinQuantity: orderLines.ruleMinQuantity,
      ruleDiscountBps: orderLines.ruleDiscountBps,
      rulePriceCents: orderLines.rulePriceCents,
    })
    .from(orderLines)
    .innerJoin(products, eq(products.id, orderLines.productId))
    .innerJoin(presentations, eq(presentations.id, orderLines.presentationId))
    .where(eq(orderLines.orderId, orderId))
    .orderBy(asc(orderLines.id))
  const allocationRows = lineRows.length
    ? await executor
        .select({
          lineId: orderAllocations.orderLineId,
          lotId: orderAllocations.lotId,
          lotCode: lots.code,
          expiresOn: lots.expiresOn,
          quantity: orderAllocations.quantity,
        })
        .from(orderAllocations)
        .innerJoin(lots, eq(lots.id, orderAllocations.lotId))
        .where(
          inArray(
            orderAllocations.orderLineId,
            lineRows.map((line) => line.id),
          ),
        )
        .orderBy(asc(orderAllocations.id))
    : []
  return {
    ...order,
    lines: lineRows.map(
      ({ ruleMinQuantity, ruleDiscountBps, rulePriceCents, ...line }) => ({
        ...line,
        rule:
          ruleMinQuantity === null
            ? null
            : {
                minQuantity: ruleMinQuantity,
                discountBps: ruleDiscountBps,
                priceCents: rulePriceCents,
              },
        allocations: allocationRows
          .filter((row) => row.lineId === line.id)
          .map(({ lineId: _lineId, ...allocation }) => allocation),
      }),
    ),
  }
}

/** Orders of one warehouse, newest first; overdue ones expire first. */
export async function listOrders(
  actor: Actor,
  input: { warehouseId: string; status?: OrderStatus; customerId?: string },
): Promise<Array<OrderSummary>> {
  authorize(actor, 'warehouse.operate', input.warehouseId)
  return db.transaction(async (tx) => {
    await requireWarehouse(tx, input.warehouseId)
    await expireOverdueOrders(tx, input.warehouseId)
    return tx
      .select(summaryColumns)
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(
        and(
          eq(orders.warehouseId, input.warehouseId),
          input.status ? eq(orders.status, input.status) : undefined,
          input.customerId
            ? eq(orders.customerId, input.customerId)
            : undefined,
        ),
      )
      .orderBy(desc(orders.createdAt), desc(orders.id))
  })
}

/** One order with lines and allocations; overdue orders of its warehouse expire first. */
export async function getOrder(
  actor: Actor,
  orderId: string,
): Promise<OrderDetail> {
  const head = (
    await db
      .select({ warehouseId: orders.warehouseId })
      .from(orders)
      .where(eq(orders.id, orderId))
  ).at(0)
  if (!head) throw orderNotFound()
  authorize(actor, 'warehouse.operate', head.warehouseId)
  return db.transaction(async (tx) => {
    await expireOverdueOrders(tx, head.warehouseId)
    return readOrder(tx, orderId)
  })
}
