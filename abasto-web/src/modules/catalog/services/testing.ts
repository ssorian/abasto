/** Shared fixtures for catalog service tests. */
import { count } from 'drizzle-orm'
import { db } from '#/db'
import type { AppError } from '#/lib/errors'
import { signIn } from '#/modules/access/lib/testing'
import {
  bootstrapOwner,
  createStaffUser,
  requireActor,
} from '#/modules/access/services/access'
import { presentations, products, suppliers } from '#/modules/catalog/db/schema'

export async function setupActors() {
  await bootstrapOwner({
    name: 'Dueño',
    email: 'dueno@abasto.test',
    password: 'secreto-123',
  })
  const owner = await requireActor(
    await signIn('dueno@abasto.test', 'secreto-123'),
  )
  await createStaffUser(owner, {
    name: 'Cajero',
    email: 'cajero@abasto.test',
    password: 'secreto-456',
  })
  const staff = await requireActor(
    await signIn('cajero@abasto.test', 'secreto-456'),
  )
  return { owner, staff }
}

export async function errorOf(run: () => Promise<unknown>) {
  try {
    await run()
  } catch (error) {
    return error as AppError
  }
  throw new Error('expected an error')
}

const countOf = async (
  table: typeof suppliers | typeof products | typeof presentations,
) => (await db.select({ value: count() }).from(table))[0]?.value

export const counts = async () => ({
  suppliers: await countOf(suppliers),
  products: await countOf(products),
  presentations: await countOf(presentations),
})
