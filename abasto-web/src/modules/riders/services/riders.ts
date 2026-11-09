import { asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { isUniqueViolation } from '#/db/errors'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { requireWarehouse } from '#/modules/inventory/services/stock-ledger'
import { riders } from '#/modules/riders/db/schema'
import { isUuid } from '#/modules/riders/lib/quantities'

export type Rider = typeof riders.$inferSelect

export const riderNotFound = () =>
  new AppError('not_found', 'No encontramos a ese repartidor.')

const duplicateName = () =>
  new AppError('conflict', 'Ya hay un repartidor con ese nombre en el almacén.')

/** A malformed warehouse id names nothing. */
export function requireWarehouseId(id: string) {
  if (!isUuid(id))
    throw new AppError('not_found', 'No encontramos ese almacén.')
}

function cleanName(name: string) {
  const clean = name.trim()
  if (!clean) throw new AppError('invalid', 'Escribe el nombre del repartidor.')
  return clean
}

/** Warehouse of a rider, or not found for a missing or malformed id. */
async function warehouseOfRider(riderId: string) {
  if (!isUuid(riderId)) throw riderNotFound()
  const found = (
    await db
      .select({ warehouseId: riders.warehouseId })
      .from(riders)
      .where(eq(riders.id, riderId))
  ).at(0)
  if (!found) throw riderNotFound()
  return found.warehouseId
}

export async function createRider(
  actor: Actor,
  input: { warehouseId: string; name: string },
): Promise<Rider> {
  authorize(actor, 'warehouse.manage', input.warehouseId)
  requireWarehouseId(input.warehouseId)
  const name = cleanName(input.name)
  try {
    return await db.transaction(async (tx) => {
      await requireWarehouse(tx, input.warehouseId)
      const [rider] = await tx
        .insert(riders)
        .values({
          warehouseId: input.warehouseId,
          name,
          createdBy: actor.userId,
        })
        .returning()
      return rider
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicateName()
    throw error
  }
}

async function update(
  actor: Actor,
  riderId: string,
  changes: Partial<Pick<Rider, 'name' | 'active'>>,
): Promise<Rider> {
  authorize(actor, 'warehouse.manage', await warehouseOfRider(riderId))
  try {
    const [rider] = await db
      .update(riders)
      .set(changes)
      .where(eq(riders.id, riderId))
      .returning()
    return rider
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicateName()
    throw error
  }
}

export const renameRider = (
  actor: Actor,
  input: { riderId: string; name: string },
) => update(actor, input.riderId, { name: cleanName(input.name) })

export const setRiderActive = (
  actor: Actor,
  input: { riderId: string; active: boolean },
) => update(actor, input.riderId, { active: input.active })

/** Riders of a warehouse by name, active or not. */
export async function listRiders(
  actor: Actor,
  input: { warehouseId: string },
): Promise<Array<Rider>> {
  authorize(actor, 'warehouse.operate', input.warehouseId)
  requireWarehouseId(input.warehouseId)
  return db
    .select()
    .from(riders)
    .where(eq(riders.warehouseId, input.warehouseId))
    .orderBy(asc(riders.name), asc(riders.id))
}
