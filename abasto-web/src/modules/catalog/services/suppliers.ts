import { asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { isUniqueViolation } from '#/db/errors'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { suppliers } from '#/modules/catalog/db/schema'

export type Supplier = typeof suppliers.$inferSelect
export type SupplierInput = {
  name: string
  contact?: string
  phone?: string
  notes?: string
}
export type SupplierPatch = Partial<SupplierInput> & { active?: boolean }

const duplicate = () =>
  new AppError('conflict', 'Ya existe un proveedor con ese nombre.')

function cleaned(input: SupplierPatch): SupplierPatch {
  const values: SupplierPatch = {}
  if (input.name !== undefined) {
    values.name = input.name.trim()
    if (!values.name) {
      throw new AppError('invalid', 'Escribe el nombre del proveedor.')
    }
  }
  if (input.contact !== undefined) values.contact = input.contact.trim()
  if (input.phone !== undefined) values.phone = input.phone.trim()
  if (input.notes !== undefined) values.notes = input.notes.trim()
  if (input.active !== undefined) values.active = input.active
  return values
}

export async function createSupplier(
  actor: Actor,
  input: SupplierInput,
): Promise<Supplier> {
  authorize(actor, 'catalog.manage')
  const values = cleaned(input) as SupplierInput
  try {
    const [created] = await db.insert(suppliers).values(values).returning()
    return created
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate()
    throw error
  }
}

export async function updateSupplier(
  actor: Actor,
  id: string,
  patch: SupplierPatch,
): Promise<Supplier> {
  authorize(actor, 'catalog.manage')
  const values = cleaned(patch)
  try {
    const query = Object.keys(values).length
      ? db.update(suppliers).set(values).where(eq(suppliers.id, id)).returning()
      : db.select().from(suppliers).where(eq(suppliers.id, id))
    const current = (await query).at(0)
    if (!current) {
      throw new AppError('not_found', 'No encontramos ese proveedor.')
    }
    return current
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate()
    throw error
  }
}

/** Any signed-in actor may read suppliers. */
export async function listSuppliers(_actor: Actor): Promise<Array<Supplier>> {
  return db.select().from(suppliers).orderBy(asc(suppliers.name))
}
