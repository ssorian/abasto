import { and, asc, eq, ne, sql } from 'drizzle-orm'
import { db } from '#/db'
import { account, user } from '#/db/auth-schema'
import type { UserRole } from '#/db/auth-schema'
import { isForeignKeyViolation, isUniqueViolation } from '#/db/errors'
import { auth, minPasswordLength } from '#/lib/auth'
import { AppError } from '#/lib/errors'
import { warehouseAssignments } from '#/modules/access/db/schema'
import type { WarehouseRole } from '#/modules/access/db/schema'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { warehouses } from '#/modules/warehouses/db/schema'

export type Executor = Pick<typeof db, 'select' | 'insert'>

export type NewUserInput = { name: string; email: string; password: string }

export const customerOnlyMessage = 'Esta cuenta solo tiene acceso a la tienda.'

/** Loads the actor behind the request's session cookie. */
export async function requireActor(headers: Headers): Promise<Actor> {
  const current = await auth.api.getSession({ headers })
  if (!current) {
    throw new AppError('unauthorized', 'Inicia sesión para continuar.')
  }
  const row = (
    await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, current.user.id))
  ).at(0)
  if (!row) throw new AppError('unauthorized', 'Inicia sesión para continuar.')
  // Store customers sign in with the same auth but never act as staff.
  if (row.role === 'customer') {
    throw new AppError('forbidden', customerOnlyMessage)
  }
  const assignments = await db
    .select({
      warehouseId: warehouseAssignments.warehouseId,
      role: warehouseAssignments.role,
    })
    .from(warehouseAssignments)
    .where(eq(warehouseAssignments.userId, current.user.id))
  return {
    userId: current.user.id,
    role: row.role,
    assignments: new Map(assignments.map((a) => [a.warehouseId, a.role])),
  }
}

export type PreparedUser = {
  name: string
  email: string
  role: UserRole
  passwordHash: string
}

/** Hashes a password the way Better Auth verifies it. Slow: keep it out of transactions. */
export async function hashPassword(password: string) {
  if (password.length < minPasswordLength) {
    throw new AppError(
      'invalid',
      `La contraseña debe tener al menos ${minPasswordLength} caracteres.`,
    )
  }
  const context = await auth.$context
  return context.password.hash(password)
}

/** Validates and hashes outside any transaction: hashing is slow CPU work. */
export async function prepareUser(
  input: NewUserInput,
  role: UserRole,
): Promise<PreparedUser> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (!name || !email.includes('@')) {
    throw new AppError('invalid', 'Escribe el nombre y un correo válido.')
  }
  const passwordHash = await hashPassword(input.password)
  return { name, email, role, passwordHash }
}

export async function insertUser(executor: Executor, prepared: PreparedUser) {
  const { name, email, role, passwordHash } = prepared
  const id = crypto.randomUUID()
  try {
    const [created] = await executor
      .insert(user)
      .values({ id, name, email, emailVerified: true, role })
      .returning({ id: user.id, name: user.name, email: user.email })
    await executor.insert(account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: passwordHash,
    })
    return created
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('conflict', 'Ya existe un usuario con ese correo.')
    }
    throw error
  }
}

/** Creates the first owner. Run once, from the `auth:create-owner` script. */
export async function bootstrapOwner(input: NewUserInput) {
  const prepared = await prepareUser(input, 'owner')
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('bootstrap-owner'))`,
    )
    const owners = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.role, 'owner'))
      .limit(1)
    if (owners.length) {
      throw new AppError('conflict', 'Ya existe un dueño registrado.')
    }
    return insertUser(tx, prepared)
  })
}

/** The owner creates a staff account; access comes from warehouse assignments. */
export async function createStaffUser(actor: Actor, input: NewUserInput) {
  authorize(actor, 'users.manage')
  const prepared = await prepareUser(input, 'staff')
  return db.transaction((tx) => insertUser(tx, prepared))
}

const notFoundMessage = 'No encontramos ese usuario o almacén.'

/** Owners reach every warehouse, so an assignment would be meaningless. */
export const ownerAssignmentMessage =
  'El dueño ya tiene acceso a todos los almacenes.'

/** Throws unless `userId` is an existing staff user. */
async function requireStaffTarget(userId: string) {
  const target = (
    await db.select({ role: user.role }).from(user).where(eq(user.id, userId))
  ).at(0)
  // Store customers are not staff: to this screen they do not exist.
  if (!target || target.role === 'customer') {
    throw new AppError('not_found', notFoundMessage)
  }
  if (target.role === 'owner') {
    throw new AppError('invalid', ownerAssignmentMessage)
  }
}

/** Grants (or changes) a user's role in one warehouse. */
export async function assignWarehouse(
  actor: Actor,
  input: { userId: string; warehouseId: string; role: WarehouseRole },
) {
  authorize(actor, 'users.manage')
  await requireStaffTarget(input.userId)
  try {
    await db
      .insert(warehouseAssignments)
      .values(input)
      .onConflictDoUpdate({
        target: [warehouseAssignments.userId, warehouseAssignments.warehouseId],
        set: { role: input.role },
      })
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new AppError('not_found', notFoundMessage)
    }
    throw error
  }
}

/** Removes a user's access to one warehouse. */
export async function unassignWarehouse(
  actor: Actor,
  input: { userId: string; warehouseId: string },
) {
  authorize(actor, 'users.manage')
  await requireStaffTarget(input.userId)
  const removed = await db
    .delete(warehouseAssignments)
    .where(
      and(
        eq(warehouseAssignments.userId, input.userId),
        eq(warehouseAssignments.warehouseId, input.warehouseId),
      ),
    )
    .returning({ userId: warehouseAssignments.userId })
  if (!removed.length) throw new AppError('not_found', notFoundMessage)
}

export type UserAssignment = {
  warehouseId: string
  warehouseName: string
  role: WarehouseRole
}

export type ManagedUser = {
  id: string
  name: string
  email: string
  role: UserRole
  assignments: Array<UserAssignment>
}

/** Every user with their warehouse assignments: owners first, then by name. */
export async function listUsers(actor: Actor): Promise<Array<ManagedUser>> {
  authorize(actor, 'users.manage')
  const [users, rows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })
      .from(user)
      .where(ne(user.role, 'customer')),
    db
      .select({
        userId: warehouseAssignments.userId,
        warehouseId: warehouseAssignments.warehouseId,
        warehouseName: warehouses.name,
        role: warehouseAssignments.role,
      })
      .from(warehouseAssignments)
      .innerJoin(
        warehouses,
        eq(warehouses.id, warehouseAssignments.warehouseId),
      )
      .orderBy(asc(warehouses.name)),
  ])
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, 'es')
  const rank = (role: UserRole) => (role === 'owner' ? 0 : 1)
  return users
    .sort((a, b) => rank(a.role) - rank(b.role) || byName(a, b))
    .map((row) => ({
      ...row,
      assignments: rows
        .filter((a) => a.userId === row.id)
        .map(({ warehouseId, warehouseName, role }) => ({
          warehouseId,
          warehouseName,
          role,
        })),
    }))
}
