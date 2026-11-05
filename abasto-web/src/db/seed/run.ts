/**
 * Loads the seed business into the development database.
 * Usage: bun run db:seed   (password from SEED_PASSWORD, default below)
 * Runs only on an empty database; an owner created with auth:create-owner is reused.
 */
import { defaultSeedPassword, seedDatabase } from '#/db/seed/seed'
import { minPasswordLength } from '#/lib/auth'
import { AppError } from '#/lib/errors'

const password = process.env.SEED_PASSWORD ?? defaultSeedPassword
if (password.length < minPasswordLength) {
  console.error(
    `SEED_PASSWORD debe tener al menos ${minPasswordLength} caracteres.`,
  )
  process.exit(1)
}

try {
  const { users } = await seedDatabase({ password })
  console.log('Seed cargada. Usuarios:')
  console.table(
    users.map((u) => ({
      Nombre: u.name,
      Correo: u.email,
      Rol: u.role,
      Almacén: u.warehouses,
      Contraseña: u.password ?? '(la tuya)',
    })),
  )
  process.exit(0)
} catch (error) {
  if (error instanceof AppError) {
    console.error(error.message)
    process.exit(1)
  }
  throw error
}
