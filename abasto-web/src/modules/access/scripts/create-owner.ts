/**
 * Creates the first owner account (public sign-up is disabled).
 * Usage: bun run auth:create-owner --name "Nombre" --email dueno@example.com
 * The password is read from OWNER_PASSWORD or asked interactively.
 */
import { parseArgs } from 'node:util'
import { AppError } from '#/lib/errors'
import { bootstrapOwner } from '#/modules/access/services/access'

const { values } = parseArgs({
  options: { name: { type: 'string' }, email: { type: 'string' } },
})

if (!values.name || !values.email) {
  console.error(
    'Usage: bun run auth:create-owner --name "Nombre" --email dueno@example.com',
  )
  process.exit(1)
}

const password = process.env.OWNER_PASSWORD ?? prompt('Password:') ?? ''

try {
  const owner = await bootstrapOwner({
    name: values.name,
    email: values.email,
    password,
  })
  console.log(`Owner created: ${owner.email}`)
  process.exit(0)
} catch (error) {
  if (error instanceof AppError) {
    console.error(error.message)
    process.exit(1)
  }
  throw error
}
