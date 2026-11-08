import { and, asc, eq, gt, sql } from 'drizzle-orm'
import { AppError } from '#/lib/errors'
import type { Actor } from '#/modules/access/lib/policy'
import { suppliers } from '#/modules/catalog/db/schema'
import { fifoValueCents } from '#/modules/inventory/lib/pending-value'
import { supplierPendings } from '#/modules/inventory/db/schema'
import type { Tx } from '#/modules/inventory/services/stock-ledger'

/**
 * Supplier balances belong to the supplier, not to one warehouse: the owner
 * or a manager of any warehouse can read and settle them.
 */
export function authorizeSupplierBalance(actor: Actor) {
  const allowed =
    actor.role === 'owner' ||
    [...actor.assignments.values()].includes('manager')
  if (!allowed) {
    throw new AppError('forbidden', 'No tienes permiso para esta acción.')
  }
}

/** Locks the supplier row so concurrent settlements cannot exceed what is owed. */
export async function lockSupplier(tx: Tx, supplierId: string) {
  const found = (
    await tx
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .for('update')
  ).at(0)
  if (!found) throw new AppError('not_found', 'No encontramos ese proveedor.')
}

/** Settled and owed base units of one product of a supplier. */
async function balanceOf(tx: Tx, supplierId: string, productId: string) {
  const owedEntries = await tx
    .select({
      quantity: supplierPendings.quantity,
      valueCents: supplierPendings.valueCents,
    })
    .from(supplierPendings)
    .where(
      and(
        eq(supplierPendings.supplierId, supplierId),
        eq(supplierPendings.productId, productId),
        gt(supplierPendings.quantity, 0),
      ),
    )
    .orderBy(asc(supplierPendings.createdAt), asc(supplierPendings.id))
  const [settled] = await tx
    .select({
      units: sql<number>`coalesce(-sum(${supplierPendings.quantity}), 0)::int`,
    })
    .from(supplierPendings)
    .where(
      and(
        eq(supplierPendings.supplierId, supplierId),
        eq(supplierPendings.productId, productId),
        sql`${supplierPendings.quantity} < 0`,
      ),
    )
  const owedUnits = owedEntries.reduce((sum, row) => sum + row.quantity, 0)
  return {
    owedEntries,
    settledUnits: settled.units,
    owedUnits: owedUnits - settled.units,
  }
}

/**
 * Settles `units` of a supplier's product, oldest owed first, by appending a
 * negative entry. Returns the settled value in cents (positive). Callers hold
 * the supplier lock; refuses with `tooMany` when more than owed is requested.
 */
export async function settleOwed(
  tx: Tx,
  input: {
    supplierId: string
    productId: string
    purchaseId: string | null
    type: 'replaced' | 'written_off'
    units: number
    actorId: string
  },
  tooMany: () => AppError,
) {
  const balance = await balanceOf(tx, input.supplierId, input.productId)
  if (input.units > balance.owedUnits) throw tooMany()
  const valueCents = fifoValueCents(
    balance.owedEntries,
    balance.settledUnits,
    input.units,
  )
  await tx.insert(supplierPendings).values({
    supplierId: input.supplierId,
    productId: input.productId,
    purchaseId: input.purchaseId,
    type: input.type,
    quantity: -input.units,
    valueCents: -valueCents,
    actorId: input.actorId,
  })
  return valueCents
}
