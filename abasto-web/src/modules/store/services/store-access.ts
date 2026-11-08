/**
 * Store accounts for a closed customer base: there is no sign-up. The owner
 * creates a `customer` user for an existing customer and hands the
 * credentials over; that account only ever reaches the store.
 */
import { and, eq } from 'drizzle-orm'
import { db } from '#/db'
import { account, session, user } from '#/db/auth-schema'
import { auth } from '#/lib/auth'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import {
  hashPassword,
  insertUser,
  prepareUser,
} from '#/modules/access/services/access'
import { customers } from '#/modules/customers/db/schema'
import { customerNotFound } from '#/modules/customers/services/customers'

/** The signed-in store customer behind a request. */
export type StoreCustomer = {
  userId: string
  customerId: string
  customerName: string
}

export const customerSignInMessage = 'Inicia sesión con tu cuenta de cliente.'
const inactiveMessage = 'Tu cuenta no está activa. Comunícate con el almacén.'
const noAccessMessage = 'Este cliente aún no tiene acceso a la tienda.'

/** Loads the active customer behind the request's session, or throws. */
export async function requireCustomer(
  headers: Headers,
): Promise<StoreCustomer> {
  const current = await auth.api.getSession({ headers })
  if (!current) throw new AppError('unauthorized', customerSignInMessage)
  const row = (
    await db
      .select({
        role: user.role,
        customerId: customers.id,
        customerName: customers.name,
        active: customers.active,
      })
      .from(user)
      .innerJoin(customers, eq(customers.userId, user.id))
      .where(eq(user.id, current.user.id))
  ).at(0)
  if (!row || row.role !== 'customer') {
    throw new AppError('unauthorized', customerSignInMessage)
  }
  if (!row.active) throw new AppError('forbidden', inactiveMessage)
  return {
    userId: current.user.id,
    customerId: row.customerId,
    customerName: row.customerName,
  }
}

/** Store sign-in email of a customer, or null when it has no access yet. */
export async function getStoreAccess(
  actor: Actor,
  customerId: string,
): Promise<{ email: string } | null> {
  authorize(actor, 'customers.manage')
  const row = (
    await db
      .select({ email: user.email })
      .from(customers)
      .innerJoin(user, eq(user.id, customers.userId))
      .where(eq(customers.id, customerId))
  ).at(0)
  return row ?? null
}

/** Creates the customer's store account. One account per customer. */
export async function grantStoreAccess(
  actor: Actor,
  input: { customerId: string; email: string; password: string },
): Promise<{ email: string }> {
  authorize(actor, 'customers.manage')
  const target = (
    await db
      .select({ name: customers.name })
      .from(customers)
      .where(eq(customers.id, input.customerId))
  ).at(0)
  if (!target) throw customerNotFound()
  const prepared = await prepareUser(
    { name: target.name, email: input.email, password: input.password },
    'customer',
  )
  return db.transaction(async (tx) => {
    const locked = (
      await tx
        .select({ userId: customers.userId })
        .from(customers)
        .where(eq(customers.id, input.customerId))
        .for('update')
    ).at(0)
    if (!locked) throw customerNotFound()
    if (locked.userId) {
      throw new AppError(
        'conflict',
        'Este cliente ya tiene acceso a la tienda.',
      )
    }
    const created = await insertUser(tx, prepared)
    await tx
      .update(customers)
      .set({ userId: created.id })
      .where(eq(customers.id, input.customerId))
    return { email: created.email }
  })
}

/** Sets a new store password and signs the customer out everywhere. */
export async function setStoreAccessPassword(
  actor: Actor,
  input: { customerId: string; password: string },
): Promise<void> {
  authorize(actor, 'customers.manage')
  const target = (
    await db
      .select({ userId: customers.userId })
      .from(customers)
      .where(eq(customers.id, input.customerId))
  ).at(0)
  if (!target) throw customerNotFound()
  if (!target.userId) throw new AppError('not_found', noAccessMessage)
  const userId = target.userId
  const passwordHash = await hashPassword(input.password)
  await db.transaction(async (tx) => {
    await tx
      .update(account)
      .set({ password: passwordHash })
      .where(
        and(eq(account.userId, userId), eq(account.providerId, 'credential')),
      )
    await tx.delete(session).where(eq(session.userId, userId))
  })
}
