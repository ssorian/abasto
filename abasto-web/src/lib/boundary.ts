import { z } from 'zod'
import { isInvalidTextRepresentation } from '#/db/errors'
import { AppError } from '#/lib/errors'
import type { AppErrorCode } from '#/lib/errors'

/** Shown instead of anything we did not explicitly expect. */
export const genericErrorMessage = 'Ocurrió un error. Intenta de nuevo.'
const invalidInputMessage = 'Revisa los datos e intenta de nuevo.'

export const emailSchema = z.email({ message: 'Escribe un correo válido.' })

export type BoundaryCode = AppErrorCode | 'unexpected'

/** What a server function returns: errors are data, so the client can read them. */
export type Result<T> =
  { ok: true; data: T } | { ok: false; code: BoundaryCode; message: string }

/** Runs a server-function body; only AppError messages reach the client. */
export async function runBoundary<T>(
  run: () => Promise<T>,
): Promise<Result<T>> {
  try {
    return { ok: true, data: await run() }
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, code: error.code, message: error.message }
    }
    // A malformed id that slipped past validation is bad input, not a crash.
    if (isInvalidTextRepresentation(error)) {
      return { ok: false, code: 'invalid', message: invalidInputMessage }
    }
    console.error('Unexpected server function error', error)
    return { ok: false, code: 'unexpected', message: genericErrorMessage }
  }
}

/** Validates untrusted input; failures become Spanish AppErrors. */
export function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  data: unknown,
): z.output<TSchema> {
  // Messages declared on the schema win; zod's built-in English ones are
  // replaced by this per-parse fallback.
  const parsed = schema.safeParse(data, { error: () => invalidInputMessage })
  if (parsed.success) return parsed.data
  throw new AppError(
    'invalid',
    parsed.error.issues[0]?.message ?? invalidInputMessage,
  )
}

/** Error thrown on the client when a server function reported a failure. */
export class ClientError extends Error {
  readonly code: BoundaryCode

  constructor(code: BoundaryCode, message: string) {
    super(message)
    this.name = 'ClientError'
    this.code = code
  }
}

export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.data
  throw new ClientError(result.code, result.message)
}
