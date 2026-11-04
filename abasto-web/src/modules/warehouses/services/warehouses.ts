import { asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { isUniqueViolation } from '#/db/errors'
import { AppError } from '#/lib/errors'
import { warehouseAssignments } from '#/modules/access/db/schema'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { warehouses } from '#/modules/warehouses/db/schema'

export type Warehouse = { id: string; name: string }

const columns = { id: warehouses.id, name: warehouses.name }

export async function createWarehouse(
  actor: Actor,
  input: { name: string },
): Promise<Warehouse> {
  authorize(actor, 'warehouses.manage')
  const name = input.name.trim()
  if (!name) throw new AppError('invalid', 'Escribe el nombre del almacén.')
  try {
    const [created] = await db
      .insert(warehouses)
      .values({ name })
      .returning(columns)
    return created
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('conflict', 'Ya existe un almacén con ese nombre.')
    }
    throw error
  }
}

/** Warehouses the actor may see: all for the owner, assigned ones for staff. */
export async function listWarehouses(actor: Actor): Promise<Array<Warehouse>> {
  if (actor.role === 'owner') {
    return db.select(columns).from(warehouses).orderBy(asc(warehouses.name))
  }
  return db
    .select(columns)
    .from(warehouses)
    .innerJoin(
      warehouseAssignments,
      eq(warehouseAssignments.warehouseId, warehouses.id),
    )
    .where(eq(warehouseAssignments.userId, actor.userId))
    .orderBy(asc(warehouses.name))
}
