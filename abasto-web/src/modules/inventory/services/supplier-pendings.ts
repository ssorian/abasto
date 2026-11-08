import { and, asc, desc, eq, gt, sql } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import type { Actor } from '#/modules/access/lib/policy'
import { products, suppliers } from '#/modules/catalog/db/schema'
import { purchaseLines, supplierPendings } from '#/modules/inventory/db/schema'
import type { PendingType } from '#/modules/inventory/db/schema'
import {
  owedBoxesOf,
  remainingEntries,
} from '#/modules/inventory/lib/pending-value'
import {
  authorizeSupplierBalance,
  lockSupplier,
  settleOwed,
} from '#/modules/inventory/services/supplier-balance'
import { requireProduct } from '#/modules/inventory/services/stock-ledger'

export type OwedPending = {
  supplierId: string
  supplierName: string
  productId: string
  productName: string
  sku: string
  /** Pieces per box of the order lines that owe it (the oldest owed one). */
  boxFactor: number
  /** Base units the supplier owes; always positive here. */
  owedQuantity: number
  owedBoxes: number
  owedValueCents: number
}

export type PendingEntry = {
  id: string
  supplierId: string
  productId: string
  purchaseId: string | null
  type: PendingType
  quantity: number
  valueCents: number
  actorId: string
  createdAt: Date
}

/** What each supplier owes per product, plus the ledger entries behind it (newest first). */
export async function listSupplierPendings(
  actor: Actor,
  supplierId?: string,
): Promise<{ owed: Array<OwedPending>; history: Array<PendingEntry> }> {
  authorizeSupplierBalance(actor)
  const scope = supplierId
    ? eq(supplierPendings.supplierId, supplierId)
    : undefined
  const owed = await db
    .select({
      supplierId: supplierPendings.supplierId,
      supplierName: suppliers.name,
      productId: supplierPendings.productId,
      productName: products.name,
      sku: products.sku,
      owedQuantity: sql<number>`sum(${supplierPendings.quantity})::int`,
      owedValueCents: sql<number>`sum(${supplierPendings.valueCents})::int`,
    })
    .from(supplierPendings)
    .innerJoin(suppliers, eq(suppliers.id, supplierPendings.supplierId))
    .innerJoin(products, eq(products.id, supplierPendings.productId))
    .where(scope)
    .groupBy(
      supplierPendings.supplierId,
      suppliers.name,
      supplierPendings.productId,
      products.name,
      products.sku,
    )
    .having(sql`sum(${supplierPendings.quantity}) > 0`)
    .orderBy(suppliers.name, products.name, products.sku)
  // Boxes count with the factor of the order line that owes them, not the
  // product's current default presentation.
  const entries = await db
    .select({
      supplierId: supplierPendings.supplierId,
      productId: supplierPendings.productId,
      quantity: supplierPendings.quantity,
      valueCents: supplierPendings.valueCents,
      boxFactor: sql<number>`coalesce(${purchaseLines.boxFactor}, 1)::int`,
    })
    .from(supplierPendings)
    .leftJoin(
      purchaseLines,
      and(
        eq(purchaseLines.purchaseId, supplierPendings.purchaseId),
        eq(purchaseLines.productId, supplierPendings.productId),
      ),
    )
    .where(and(scope, gt(supplierPendings.quantity, 0)))
    .orderBy(asc(supplierPendings.createdAt), asc(supplierPendings.id))
  const history = await db
    .select()
    .from(supplierPendings)
    .where(scope)
    .orderBy(desc(supplierPendings.createdAt), desc(supplierPendings.id))
  return {
    owed: owed.map((row) => {
      const own = entries.filter(
        (entry) =>
          entry.supplierId === row.supplierId &&
          entry.productId === row.productId,
      )
      const settledUnits =
        own.reduce((sum, entry) => sum + entry.quantity, 0) - row.owedQuantity
      return {
        ...row,
        boxFactor: remainingEntries(own, settledUnits)[0]?.boxFactor ?? 1,
        owedBoxes: owedBoxesOf(own, settledUnits),
      }
    }),
    history,
  }
}

const badBoxes = () =>
  new AppError(
    'invalid',
    'Las cajas a cancelar deben ser un número entero mayor que cero.',
  )

/**
 * "A lo chino": the supplier no longer owes these boxes and the value is
 * discounted from what we pay. Only the owner or a warehouse manager
 * (supplier balances are not tied to one warehouse).
 */
export async function writeOffPendings(
  actor: Actor,
  input: { supplierId: string; productId: string; boxes: number },
): Promise<{ valueCents: number }> {
  authorizeSupplierBalance(actor)
  if (!Number.isSafeInteger(input.boxes) || input.boxes <= 0) throw badBoxes()
  return db.transaction(async (tx) => {
    await lockSupplier(tx, input.supplierId)
    await requireProduct(tx, input.productId)
    const { valueCents } = await settleOwed(
      tx,
      {
        supplierId: input.supplierId,
        productId: input.productId,
        purchaseId: null,
        type: 'written_off',
        boxes: input.boxes,
        actorId: actor.userId,
      },
      () =>
        new AppError(
          'invalid',
          'Las cajas a cancelar superan el saldo del proveedor.',
        ),
    )
    return { valueCents }
  })
}
