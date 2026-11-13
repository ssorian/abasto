import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { db } from '#/db'
import { AppError } from '#/lib/errors'
import type { Actor } from '#/modules/access/lib/policy'
import { products, suppliers } from '#/modules/catalog/db/schema'
import {
  pendingKindOf,
  purchaseLines,
  purchases,
  supplierPendings,
} from '#/modules/inventory/db/schema'
import type {
  PendingKind,
  ReturnResolution,
} from '#/modules/inventory/db/schema'
import { orderCode } from '#/modules/inventory/lib/order-code'
import { openOf, settleBoxes } from '#/modules/inventory/lib/pending-value'
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

export const balanceNotFound = () =>
  new AppError('not_found', 'No encontramos ese saldo.')

/** An origin ledger entry (Por reponer or Por devolver) with what has been settled of it. */
export type Balance = {
  id: string
  kind: PendingKind
  supplierId: string
  supplierName: string
  productId: string
  productName: string
  sku: string
  purchaseId: string | null
  /** Lot code of the order that caused it: its reference or `PED-` + folio. */
  originCode: string
  /** Pieces per box of the order line that owes it. */
  boxFactor: number
  quantity: number
  valueCents: number
  /** Net of reopenings; positive. */
  settledUnits: number
  settledValueCents: number
  createdAt: Date
}

/**
 * Origin entries with their settled totals, oldest first. Boxes count with the
 * factor of the order line that owes them, not the product's current default.
 */
export async function loadBalances(
  tx: Tx | typeof db,
  where: { ids?: Array<string>; supplierId?: string },
): Promise<Array<Balance>> {
  if (where.ids && !where.ids.length) return []
  const rows = await tx
    .select({
      id: supplierPendings.id,
      type: supplierPendings.type,
      supplierId: supplierPendings.supplierId,
      supplierName: suppliers.name,
      productId: supplierPendings.productId,
      productName: products.name,
      sku: products.sku,
      purchaseId: supplierPendings.purchaseId,
      reference: sql<string>`coalesce(${purchases.reference}, '')`,
      folio: sql<number>`coalesce(${purchases.folio}, 0)::int`,
      boxFactor: sql<number>`coalesce(${purchaseLines.boxFactor}, 1)::int`,
      quantity: supplierPendings.quantity,
      valueCents: supplierPendings.valueCents,
      settledUnits: sql<number>`coalesce((select -sum(settlement.quantity) from supplier_pendings as settlement where settlement.settles_id = ${supplierPendings.id}), 0)::int`,
      settledValueCents: sql<number>`coalesce((select -sum(settlement.value_cents) from supplier_pendings as settlement where settlement.settles_id = ${supplierPendings.id}), 0)::int`,
      createdAt: supplierPendings.createdAt,
    })
    .from(supplierPendings)
    .innerJoin(suppliers, eq(suppliers.id, supplierPendings.supplierId))
    .innerJoin(products, eq(products.id, supplierPendings.productId))
    .leftJoin(purchases, eq(purchases.id, supplierPendings.purchaseId))
    .leftJoin(
      purchaseLines,
      and(
        eq(purchaseLines.purchaseId, supplierPendings.purchaseId),
        eq(purchaseLines.productId, supplierPendings.productId),
      ),
    )
    .where(
      and(
        isNull(supplierPendings.settlesId),
        where.ids ? inArray(supplierPendings.id, where.ids) : undefined,
        where.supplierId
          ? eq(supplierPendings.supplierId, where.supplierId)
          : undefined,
      ),
    )
    .orderBy(asc(supplierPendings.createdAt), asc(supplierPendings.id))
  return rows.map(({ type, reference, folio, ...row }) => ({
    ...row,
    kind: pendingKindOf(type as 'missing' | 'damaged'),
    originCode: row.purchaseId ? orderCode({ reference, folio }) : '',
  }))
}

export const boxesOpen = (balance: Balance) => openOf(balance).boxes

/**
 * Loads balances by id for a supplier whose lock the caller holds. Refuses ids
 * that do not exist or belong to another supplier; keeps the order of `ids`.
 */
export async function loadSupplierBalances(
  tx: Tx,
  supplierId: string,
  ids: Array<string>,
) {
  const found = await loadBalances(tx, { ids })
  const byId = new Map(found.map((balance) => [balance.id, balance]))
  return ids.map((id) => {
    const balance = byId.get(id)
    if (!balance) throw balanceNotFound()
    if (balance.supplierId !== supplierId) {
      throw new AppError('invalid', 'Ese saldo no pertenece a este proveedor.')
    }
    return balance
  })
}

type SettleInput = {
  balance: Balance
  boxes: number
  type: 'replaced' | 'returned'
  /** Receiving order for a replacement; null otherwise. */
  purchaseId: string | null
  actorId: string
  resolution?: ReturnResolution
  creditCents?: number | null
}

/**
 * Settles `boxes` boxes of an origin entry by appending a negative entry that
 * names it. Returns the settled value in cents (positive) and units. Callers
 * hold the supplier lock; refuses with `tooMany` when more than open is asked.
 */
export async function settleBalance(
  tx: Tx,
  input: SettleInput,
  tooMany: () => AppError,
) {
  const settled = settleBoxes(input.balance, input.boxes)
  if (!settled) throw tooMany()
  await tx.insert(supplierPendings).values({
    supplierId: input.balance.supplierId,
    productId: input.balance.productId,
    purchaseId: input.purchaseId,
    settlesId: input.balance.id,
    type: input.type,
    quantity: -settled.units,
    valueCents: -settled.valueCents,
    resolution: input.resolution ?? null,
    creditCents: input.creditCents ?? null,
    actorId: input.actorId,
  })
  return settled
}

/**
 * Closes whatever is still open of a "Por reponer" balance on a new order
 * ("a lo chino"). Returns the value in cents (positive).
 */
export async function discountBalance(
  tx: Tx,
  balance: Balance,
  purchaseId: string,
  actorId: string,
) {
  const { units } = openOf(balance)
  const valueCents = balance.valueCents - balance.settledValueCents
  await tx.insert(supplierPendings).values({
    supplierId: balance.supplierId,
    productId: balance.productId,
    purchaseId,
    settlesId: balance.id,
    type: 'discounted',
    quantity: -units,
    valueCents: -valueCents,
    actorId,
  })
  return valueCents
}

/** Reopens, with mirror entries, the balances a cancelled order had discounted. */
export async function reopenDiscounts(
  tx: Tx,
  purchaseId: string,
  actorId: string,
) {
  const discounted = await tx
    .select()
    .from(supplierPendings)
    .where(
      and(
        eq(supplierPendings.purchaseId, purchaseId),
        eq(supplierPendings.type, 'discounted'),
      ),
    )
    .orderBy(asc(supplierPendings.createdAt), asc(supplierPendings.id))
  if (!discounted.length) return
  await tx.insert(supplierPendings).values(
    discounted.map((entry) => ({
      supplierId: entry.supplierId,
      productId: entry.productId,
      purchaseId,
      settlesId: entry.settlesId,
      type: 'reopened' as const,
      quantity: -entry.quantity,
      valueCents: -entry.valueCents,
      actorId,
    })),
  )
}
