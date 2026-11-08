import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import type { Actor } from '#/modules/access/lib/policy'
import { presentations, products, suppliers } from '#/modules/catalog/db/schema'
import { supplierPendings } from '#/modules/inventory/db/schema'
import type { PendingType } from '#/modules/inventory/db/schema'
import { loadBoxProducts } from '#/modules/inventory/services/box-products'
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
      boxFactor: sql<number>`coalesce(${presentations.factor}, 1)::int`,
      owedQuantity: sql<number>`sum(${supplierPendings.quantity})::int`,
      owedValueCents: sql<number>`sum(${supplierPendings.valueCents})::int`,
    })
    .from(supplierPendings)
    .innerJoin(suppliers, eq(suppliers.id, supplierPendings.supplierId))
    .innerJoin(products, eq(products.id, supplierPendings.productId))
    .leftJoin(
      presentations,
      and(
        eq(presentations.productId, products.id),
        eq(presentations.isDefault, true),
      ),
    )
    .where(scope)
    .groupBy(
      supplierPendings.supplierId,
      suppliers.name,
      supplierPendings.productId,
      products.name,
      products.sku,
      presentations.factor,
    )
    .having(sql`sum(${supplierPendings.quantity}) > 0`)
    .orderBy(suppliers.name, products.name, products.sku)
  const history = await db
    .select()
    .from(supplierPendings)
    .where(scope)
    .orderBy(desc(supplierPendings.createdAt), desc(supplierPendings.id))
  return {
    owed: owed.map((row) => ({
      ...row,
      owedBoxes: Math.floor(row.owedQuantity / row.boxFactor),
    })),
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
    const product = (await loadBoxProducts(tx, [input.productId])).get(
      input.productId,
    )
    const valueCents = await settleOwed(
      tx,
      {
        supplierId: input.supplierId,
        productId: input.productId,
        purchaseId: null,
        type: 'written_off',
        units: input.boxes * (product?.factor ?? 1),
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
