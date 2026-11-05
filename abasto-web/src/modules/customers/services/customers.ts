import { and, asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { isUniqueViolation } from '#/db/errors'
import { AppError } from '#/lib/errors'
import { authorize, can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { customers } from '#/modules/customers/db/schema'

export type Customer = typeof customers.$inferSelect
export type CustomerInput = {
  name: string
  contact?: string
  phone?: string
  addresses?: Array<string>
  notes?: string
}
export type CustomerPatch = Partial<CustomerInput> & { active?: boolean }
export type CustomerCredit = {
  enabled: boolean
  /** Integer cents, 0 to int4 max. */
  limitCents: number
  termsDays: number
}

const INT4_MAX = 2147483647

const duplicate = () =>
  new AppError('conflict', 'Ya existe un cliente con ese nombre.')

export const customerNotFound = () =>
  new AppError('not_found', 'No encontramos ese cliente.')

function cleaned(input: CustomerPatch): CustomerPatch {
  const values: CustomerPatch = {}
  if (input.name !== undefined) {
    values.name = input.name.trim()
    if (!values.name) {
      throw new AppError('invalid', 'Escribe el nombre del cliente.')
    }
  }
  if (input.contact !== undefined) values.contact = input.contact.trim()
  if (input.phone !== undefined) values.phone = input.phone.trim()
  if (input.notes !== undefined) values.notes = input.notes.trim()
  if (input.addresses !== undefined) {
    values.addresses = input.addresses.map((a) => a.trim()).filter(Boolean)
  }
  if (input.active !== undefined) values.active = input.active
  return values
}

const isCount = (value: number, max = INT4_MAX) =>
  Number.isInteger(value) && value >= 0 && value <= max

export async function createCustomer(
  actor: Actor,
  input: CustomerInput,
): Promise<Customer> {
  authorize(actor, 'customers.manage')
  const values = cleaned(input) as CustomerInput
  try {
    const [created] = await db.insert(customers).values(values).returning()
    return created
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate()
    throw error
  }
}

export async function updateCustomer(
  actor: Actor,
  id: string,
  patch: CustomerPatch,
): Promise<Customer> {
  authorize(actor, 'customers.manage')
  const values = cleaned(patch)
  try {
    const query = Object.keys(values).length
      ? db.update(customers).set(values).where(eq(customers.id, id)).returning()
      : db.select().from(customers).where(eq(customers.id, id))
    const current = (await query).at(0)
    if (!current) throw customerNotFound()
    return current
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate()
    throw error
  }
}

/** Credit settings: enabled flag, limit in cents and payment terms in days. */
export async function setCustomerCredit(
  actor: Actor,
  id: string,
  credit: CustomerCredit,
): Promise<Customer> {
  authorize(actor, 'customers.manage')
  if (!isCount(credit.limitCents) || !isCount(credit.termsDays, 3650)) {
    throw new AppError('invalid', 'Revisa nombre, límite y plazo.')
  }
  const updated = (
    await db
      .update(customers)
      .set({
        creditEnabled: credit.enabled,
        creditLimitCents: credit.limitCents,
        termsDays: credit.termsDays,
      })
      .where(eq(customers.id, id))
      .returning()
  ).at(0)
  if (!updated) throw customerNotFound()
  return updated
}

/**
 * Any signed-in actor reads active customers (needed to sell); only the owner
 * sees inactive ones. `active` filters the owner's list; staff always get active.
 */
export async function listCustomers(
  actor: Actor,
  filter: { active?: boolean } = {},
): Promise<Array<Customer>> {
  const active = can(actor, 'customers.manage') ? filter.active : true
  return db
    .select()
    .from(customers)
    .where(active === undefined ? undefined : eq(customers.active, active))
    .orderBy(asc(customers.name))
}

export async function getCustomer(actor: Actor, id: string): Promise<Customer> {
  const visible = can(actor, 'customers.manage')
    ? eq(customers.id, id)
    : and(eq(customers.id, id), eq(customers.active, true))
  const customer = (await db.select().from(customers).where(visible)).at(0)
  if (!customer) throw customerNotFound()
  return customer
}
