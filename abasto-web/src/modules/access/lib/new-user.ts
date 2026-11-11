import { emailSchema } from '#/lib/boundary'

type NewUserFields = { name: string; email: string; password: string }

/** Every problem of the "Nuevo usuario" form, one Spanish sentence per field. */
export function newUserProblems(
  { name, email, password }: NewUserFields,
  minPasswordLength: number,
): Array<string> {
  const problems: Array<string> = []
  if (!name.trim()) problems.push('Escribe el nombre.')
  if (!emailSchema.safeParse(email.trim()).success) {
    problems.push('Escribe un correo válido.')
  }
  if (!password) {
    problems.push(
      `Escribe la contraseña inicial (mínimo ${minPasswordLength} caracteres).`,
    )
  } else if (password.length < minPasswordLength) {
    problems.push(
      `La contraseña debe tener al menos ${minPasswordLength} caracteres.`,
    )
  }
  return problems
}
