import { eq, sql } from 'drizzle-orm'
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

type Executor = Pick<typeof db, 'select' | 'insert'>

export type NewUserInput = { name: string; email: string; password: string }

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

async function insertUser(
  executor: Executor,
  input: NewUserInput,
  role: UserRole,
) {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (!name || !email.includes('@')) {
    throw new AppError('invalid', 'Escribe el nombre y un correo válido.')
  }
  if (input.password.length < minPasswordLength) {
    throw new AppError(
      'invalid',
      `La contraseña debe tener al menos ${minPasswordLength} caracteres.`,
    )
  }
  const context = await auth.$context
  const password = await context.password.hash(input.password)
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
      password,
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
    return insertUser(tx, input, 'owner')
  })
}

/** The owner creates a staff account; access comes from warehouse assignments. */
export async function createStaffUser(actor: Actor, input: NewUserInput) {
  authorize(actor, 'users.manage')
  return db.transaction((tx) => insertUser(tx, input, 'staff'))
}

/** Grants (or changes) a user's role in one warehouse. */
export async function assignWarehouse(
  actor: Actor,
  input: { userId: string; warehouseId: string; role: WarehouseRole },
) {
  authorize(actor, 'users.manage')
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
      throw new AppError('not_found', 'No encontramos ese usuario o almacén.')
    }
    throw error
  }
}
