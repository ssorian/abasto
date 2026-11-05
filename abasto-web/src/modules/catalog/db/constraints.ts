import { isUniqueViolation } from '#/db/errors'

/** Name of the violated unique index, or undefined when `error` is not a unique violation. */
export function violatedUniqueIndex(error: unknown): string | undefined {
  if (!isUniqueViolation(error)) return undefined
  let current: unknown = error
  for (let depth = 0; current && depth < 3; depth++) {
    const name = (current as { constraint?: unknown }).constraint
    if (typeof name === 'string') return name
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}
