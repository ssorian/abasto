import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { products } from '#/modules/catalog/db/schema'
import {
  loadProduct,
  productNotFound,
} from '#/modules/catalog/services/product-reads'
import type {
  Executor,
  Product,
} from '#/modules/catalog/services/product-reads'
import {
  lots,
  purchaseLines,
  purchases,
  supplierPendings,
} from '#/modules/inventory/db/schema'
import { orderLines, orders } from '#/modules/orders/db/schema'
import {
  riderAssignmentLines,
  riderAssignments,
} from '#/modules/riders/db/schema'
import { transferLines, transfers } from '#/modules/transfers/db/schema'

const refusal = (reason: string) =>
  new AppError('conflict', `No se puede archivar este producto: ${reason}`)

type Reader = Pick<typeof db, 'select'>

/** Throws the first reason why a product still has stock or open work. */
async function requireArchivable(tx: Reader, id: string) {
  const [stock] = await tx
    .select({
      onHand: sql<number>`coalesce(sum(${lots.onHand}), 0)::int`,
      reserved: sql<number>`coalesce(sum(${lots.reserved}), 0)::int`,
    })
    .from(lots)
    .where(eq(lots.productId, id))
  if (stock.reserved > 0) {
    throw refusal('tiene unidades reservadas. Cancela o entrega esos pedidos.')
  }
  if (stock.onHand > 0) {
    throw refusal(
      'todavía tiene existencias en algún almacén. Quítalas o véndelas antes.',
    )
  }
  const openOrders = await tx
    .select({ id: orderLines.id })
    .from(orderLines)
    .innerJoin(orders, eq(orders.id, orderLines.orderId))
    .where(
      and(
        eq(orderLines.productId, id),
        inArray(orders.status, ['Reservado', 'Preparado']),
      ),
    )
    .limit(1)
  if (openOrders.length) {
    throw refusal(
      'está en pedidos de clientes abiertos (Reservado o Preparado).',
    )
  }
  const openPurchases = await tx
    .select({ id: purchaseLines.id })
    .from(purchaseLines)
    .innerJoin(purchases, eq(purchases.id, purchaseLines.purchaseId))
    .where(and(eq(purchaseLines.productId, id), eq(purchases.status, 'Pedido')))
    .limit(1)
  if (openPurchases.length) {
    throw refusal('está en un pedido a proveedor que aún no se recibe.')
  }
  const onRoute = await tx
    .select({ id: riderAssignmentLines.id })
    .from(riderAssignmentLines)
    .innerJoin(
      riderAssignments,
      eq(riderAssignments.id, riderAssignmentLines.assignmentId),
    )
    .where(
      and(
        eq(riderAssignmentLines.productId, id),
        eq(riderAssignments.status, 'En ruta'),
      ),
    )
    .limit(1)
  if (onRoute.length) {
    throw refusal('un repartidor lo lleva en ruta. Liquida o cancela la ruta.')
  }
  const inTransit = await tx
    .select({ id: transferLines.id })
    .from(transferLines)
    .innerJoin(transfers, eq(transfers.id, transferLines.transferId))
    .where(
      and(eq(transferLines.productId, id), eq(transfers.status, 'En tránsito')),
    )
    .limit(1)
  if (inTransit.length) {
    throw refusal('está en un traslado en tránsito.')
  }
  const [owed] = await tx
    .select({
      balance: sql<number>`coalesce(sum(${supplierPendings.quantity}), 0)::int`,
    })
    .from(supplierPendings)
    .where(eq(supplierPendings.productId, id))
  if (owed.balance > 0) {
    throw refusal(
      'tiene un saldo abierto con el proveedor (por reponer o devolver).',
    )
  }
}

async function lockProduct(tx: Executor, id: string) {
  const rows = await tx
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, id))
    .for('update')
  if (!rows.length) throw productNotFound()
}

/**
 * Archives a product: it leaves the catalog, pickers and store but keeps its
 * history. Only without stock and without open work; only the owner. Archiving
 * an archived product changes nothing.
 */
export async function archiveProduct(
  actor: Actor,
  id: string,
): Promise<Product> {
  authorize(actor, 'catalog.manage')
  return db.transaction(async (tx) => {
    await lockProduct(tx, id)
    const stored = await loadProduct(tx, id)
    if (stored.archivedAt) return stored
    await requireArchivable(tx, id)
    await tx
      .update(products)
      .set({ archivedAt: new Date() })
      .where(eq(products.id, id))
    return loadProduct(tx, id)
  })
}

/** Brings an archived product back to the catalog; only the owner. */
export async function restoreProduct(
  actor: Actor,
  id: string,
): Promise<Product> {
  authorize(actor, 'catalog.manage')
  return db.transaction(async (tx) => {
    await lockProduct(tx, id)
    await tx
      .update(products)
      .set({ archivedAt: null })
      .where(eq(products.id, id))
    return loadProduct(tx, id)
  })
}
