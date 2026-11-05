import { inArray } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { presentations } from '#/modules/catalog/db/schema'
import { presentationPrices } from '#/modules/pricing/db/schema'
import type { PriceSource } from '#/modules/pricing/db/schema'
import { requireWarehouse } from '#/modules/pricing/services/price-reads'
import type { Tx } from '#/modules/inventory/services/stock-ledger'

export type PriceInput = { presentationId: string; priceCents: number }
export type PriceRowInput = PriceInput & { warehouseId: string }

export function validatePrices(prices: Array<PriceInput>) {
  if (!prices.length) {
    throw new AppError('invalid', 'Indica al menos un precio.')
  }
  for (const { priceCents } of prices) {
    if (!Number.isSafeInteger(priceCents) || priceCents <= 0) {
      throw new AppError('invalid', 'El precio debe ser mayor que cero.')
    }
  }
  if (
    new Set(prices.map((price) => price.presentationId)).size !== prices.length
  ) {
    throw new AppError('invalid', 'Una presentación aparece más de una vez.')
  }
}

/** Appends price rows (never updates); the caller owns the transaction. */
export async function insertPrices(
  tx: Tx,
  actor: Actor,
  rows: Array<PriceRowInput>,
  source: PriceSource,
  reason = '',
) {
  await tx.insert(presentationPrices).values(
    rows.map((row) => ({
      ...row,
      createdBy: actor.userId,
      source,
      reason: reason.trim(),
    })),
  )
}

export async function requirePresentations(tx: Tx, ids: Array<string>) {
  const found = await tx
    .select({ id: presentations.id })
    .from(presentations)
    .where(inArray(presentations.id, ids))
  if (found.length !== new Set(ids).size) {
    throw new AppError('not_found', 'No encontramos esa presentación.')
  }
}

/** Sets the own price of presentations in one warehouse; every change is a new history row. */
export async function setPrices(
  actor: Actor,
  input: { warehouseId: string; prices: Array<PriceInput>; reason?: string },
) {
  authorize(actor, 'warehouse.manage', input.warehouseId)
  validatePrices(input.prices)
  await db.transaction(async (tx) => {
    await requireWarehouse(tx, input.warehouseId)
    await requirePresentations(
      tx,
      input.prices.map((price) => price.presentationId),
    )
    await insertPrices(
      tx,
      actor,
      input.prices.map((price) => ({
        ...price,
        warehouseId: input.warehouseId,
      })),
      'manual',
      input.reason,
    )
  })
}
