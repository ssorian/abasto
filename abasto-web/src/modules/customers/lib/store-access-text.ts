import { emailSchema } from '#/lib/boundary'

/** Same as `minPasswordLength` in lib/auth, which cannot be imported client-side. */
const minPasswordLength = 8

/** The credentials as the owner sends them to the customer. */
export const accessText = (email: string, password: string) =>
  `Acceso a la tienda\nCorreo: ${email}\nContraseña: ${password}`

/** Problems of the store access form, one Spanish sentence each. */
export function storeAccessProblems(
  fields: { email: string; password: string },
  needsEmail: boolean,
): Array<string> {
  const problems: Array<string> = []
  if (needsEmail && !emailSchema.safeParse(fields.email.trim()).success) {
    problems.push('Escribe un correo válido.')
  }
  if (!fields.password) {
    problems.push(
      `Escribe la contraseña (mínimo ${minPasswordLength} caracteres).`,
    )
  } else if (fields.password.length < minPasswordLength) {
    problems.push(
      `La contraseña debe tener al menos ${minPasswordLength} caracteres.`,
    )
  }
  return problems
}
