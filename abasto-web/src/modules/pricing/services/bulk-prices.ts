import { and, eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize, can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { presentations, products } from '#/modules/catalog/db/schema'
import {
  currentOwnPrices,
  requireWarehouse,
  roundDiv,
} from '#/modules/pricing/services/price-reads'
import { insertPrices } from '#/modules/pricing/services/prices'
import { warehouses } from '#/modules/warehouses/db/schema'

export type PriceChange =
  | {
      kind: 'percent'
      /** Basis points; 500 = +5%, -1000 = -10%. */ bps: number
    }
  | { kind: 'fixed'; /** Signed integer cents. */ cents: number }

export type BulkChangeInput = {
  /** Warehouses to change, or every warehouse the actor can manage. */
  warehouseIds: Array<string> | 'all'
  supplierId?: string
  category?: string
  productIds?: Array<string>
  change: PriceChange
  reason?: string
}

const nextPrice = (price: number, change: PriceChange) =>
  change.kind === 'fixed'
    ? price + change.cents
    : price <= 0 || 10000 + change.bps <= 0
      ? 0
      : roundDiv(BigInt(price) * BigInt(10000 + change.bps), 10000n)

function validate(input: BulkChangeInput) {
  const amount =
    input.change.kind === 'fixed' ? input.change.cents : input.change.bps
  if (!Number.isSafeInteger(amount)) {
    throw new AppError('invalid', 'El cambio debe ser un número entero.')
  }
  if (amount === 0) {
    throw new AppError('invalid', 'El cambio no puede ser cero.')
  }
  if (
    !input.supplierId &&
    !input.category?.trim() &&
    !input.productIds?.length
  ) {
    throw new AppError(
      'invalid',
      'Elige un proveedor, una categoría o productos.',
    )
  }
}

async function targetWarehouses(
  actor: Actor,
  selection: BulkChangeInput['warehouseIds'],
) {
  if (selection === 'all') {
    const all = await db.select({ id: warehouses.id }).from(warehouses)
    return all
      .map((row) => row.id)
      .filter((id) => can(actor, 'warehouse.manage', id))
  }
  const ids = [...new Set(selection)]
  for (const id of ids) authorize(actor, 'warehouse.manage', id)
  return ids
}

/**
 * Changes the own price of every matching presentation in the selected
 * warehouses. All-or-nothing: one transaction, and any result at or below
 * zero rejects the whole operation.
 */
export async function bulkChangePrices(
  actor: Actor,
  input: BulkChangeInput,
): Promise<{ changed: number }> {
  const warehouseIds = await targetWarehouses(actor, input.warehouseIds)
  if (!warehouseIds.length) {
    throw new AppError('invalid', 'Elige al menos un almacén.')
  }
  validate(input)
  const category = input.category?.trim()
  return db.transaction(async (tx) => {
    for (const id of warehouseIds) await requireWarehouse(tx, id)
    const matched = await tx
      .select({ id: presentations.id })
      .from(presentations)
      .innerJoin(products, eq(products.id, presentations.productId))
      .where(
        and(
          input.supplierId
            ? eq(products.supplierId, input.supplierId)
            : undefined,
          category ? eq(products.category, category) : undefined,
          input.productIds?.length
            ? inArray(products.id, input.productIds)
            : undefined,
        ),
      )
    const presentationIds = matched.map((row) => row.id)
    const current = await currentOwnPrices(tx, warehouseIds, presentationIds)
    const rows = [...current].flatMap(([key, price]) => {
      const priceCents = nextPrice(price, input.change)
      if (priceCents <= 0) {
        throw new AppError(
          'invalid',
          'El cambio deja un precio en cero o menos. No se cambió ningún precio.',
        )
      }
      if (priceCents === price) return []
      const [warehouseId, presentationId] = key.split(':')
      return [{ warehouseId, presentationId, priceCents }]
    })
    if (!rows.length) {
      throw new AppError(
        'not_found',
        'No hay precios que cambiar con esa selección.',
      )
    }
    await insertPrices(tx, actor, rows, 'bulk', input.reason)
    return { changed: rows.length }
  })
}
