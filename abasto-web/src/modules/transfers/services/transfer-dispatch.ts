import { and, asc, eq, gt, gte, inArray, isNull, or } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { products } from '#/modules/catalog/db/schema'
import { lots } from '#/modules/inventory/db/schema'
import {
  appendMovement,
  assertFitsInt4,
  byFefo,
  isWholeNumber,
  MAX_INT4,
  requireWarehouse,
} from '#/modules/inventory/services/stock-ledger'
import { businessDate } from '#/modules/orders/services/clock'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'
import { transferLines, transfers } from '#/modules/transfers/db/schema'
import { warehouses } from '#/modules/warehouses/db/schema'

export type DispatchInput = {
  fromWarehouseId: string
  toWarehouseId: string
  notes?: string
  /** Base units per product. */
  items: Array<{ productId: string; quantity: number }>
}

/** Validates the request and merges repeated products. */
function mergedItems(input: DispatchInput) {
  if (input.fromWarehouseId === input.toWarehouseId) {
    throw new AppError(
      'invalid',
      'El origen y el destino del traslado deben ser distintos.',
    )
  }
  if (!input.items.length) {
    throw new AppError('invalid', 'Agrega al menos un producto al traslado.')
  }
  const wanted = new Map<string, number>()
  for (const item of input.items) {
    if (!isWholeNumber(item.quantity) || item.quantity <= 0) {
      throw new AppError('invalid', 'La cantidad debe ser mayor que cero.')
    }
    const total = (wanted.get(item.productId) ?? 0) + item.quantity
    assertFitsInt4(total, `La cantidad no puede ser mayor que ${MAX_INT4}.`)
    wanted.set(item.productId, total)
  }
  return wanted
}

/**
 * Takes the requested units from the source warehouse (available, non-expired
 * lots, earliest expiry first) and leaves the transfer "En tránsito". Nothing
 * exists in the destination until it is received.
 */
export async function dispatchTransfer(
  actor: Actor,
  input: DispatchInput,
): Promise<{ id: string }> {
  authorize(actor, 'warehouse.manage', input.fromWarehouseId)
  const wanted = mergedItems(input)
  return db.transaction(async (tx) => {
    await requireWarehouse(tx, input.fromWarehouseId)
    await requireWarehouse(tx, input.toWarehouseId)
    // Overdue orders release their units first (this takes the warehouse lock).
    await expireOverdueOrders(tx, input.fromWarehouseId)
    const productIds = [...wanted.keys()]
    const found = await tx
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(inArray(products.id, productIds))
    if (found.length !== productIds.length) {
      throw new AppError('not_found', 'No encontramos ese producto.')
    }
    const names = new Map(found.map((product) => [product.id, product.name]))
    // Row locks in id order, like every order operation.
    const candidates = await tx
      .select()
      .from(lots)
      .where(
        and(
          eq(lots.warehouseId, input.fromWarehouseId),
          inArray(lots.productId, productIds),
          gt(lots.onHand, lots.reserved),
          // Past-expiry lots are never moved; a lot expiring today still is.
          or(isNull(lots.expiresOn), gte(lots.expiresOn, businessDate())),
        ),
      )
      .orderBy(asc(lots.id))
      .for('update')
    const taken: Array<{ lot: (typeof candidates)[number]; quantity: number }> =
      []
    for (const [productId, quantity] of wanted) {
      let remaining = quantity
      const ordered = candidates
        .filter((lot) => lot.productId === productId)
        .sort((a, b) => byFefo(a, b) || (a.id < b.id ? -1 : 1))
      for (const lot of ordered) {
        if (!remaining) break
        const take = Math.min(lot.onHand - lot.reserved, remaining)
        taken.push({ lot, quantity: take })
        remaining -= take
      }
      if (remaining) {
        throw new AppError(
          'conflict',
          `No hay suficiente existencia disponible de ${names.get(productId)}.`,
        )
      }
    }
    const [transfer] = await tx
      .insert(transfers)
      .values({
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        status: 'En tránsito',
        notes: input.notes?.trim() ?? '',
        createdBy: actor.userId,
      })
      .returning({ id: transfers.id })
    const destination = (
      await tx
        .select({ name: warehouses.name })
        .from(warehouses)
        .where(eq(warehouses.id, input.toWarehouseId))
    )[0]
    for (const { lot, quantity } of taken) {
      await tx.insert(transferLines).values({
        transferId: transfer.id,
        productId: lot.productId,
        sourceLotId: lot.id,
        quantity,
      })
      await appendMovement(tx, lot, {
        type: 'transfer_out',
        quantity: -quantity,
        reason: `Traslado a ${destination.name}`,
        reference: transfer.id,
        actorId: actor.userId,
      })
    }
    return { id: transfer.id }
  })
}
