/** Postgres SQLSTATE of the error or of the driver error Drizzle wraps. */
function sqlState(error: unknown): string | undefined {
  let current: unknown = error
  for (let depth = 0; current && depth < 3; depth++) {
    const code = (current as { code?: unknown }).code
    if (typeof code === 'string') return code
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}

export const isUniqueViolation = (error: unknown) => sqlState(error) === '23505'

export const isForeignKeyViolation = (error: unknown) =>
  sqlState(error) === '23503'
