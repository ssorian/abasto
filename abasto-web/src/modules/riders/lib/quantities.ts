import { AppError } from '#/lib/errors'
import { fitsInt4 } from '#/modules/inventory/services/stock-ledger'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Whether the text can be a uuid; anything else can never name a row. */
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && uuidPattern.test(value)

/** A quantity typed as boxes and/or loose units, e.g. "40 cajas y 20 unidades". */
export type BoxesAndUnits = { boxes?: number; units?: number }

/**
 * Converts boxes plus units to base units with the box factor. Both parts
 * must be whole numbers of at least zero; the total fits a Postgres integer.
 */
export function toBaseUnits(
  { boxes = 0, units = 0 }: BoxesAndUnits,
  boxFactor: number,
): number {
  if (
    !Number.isSafeInteger(boxes) ||
    !Number.isSafeInteger(units) ||
    boxes < 0 ||
    units < 0
  ) {
    throw new AppError(
      'invalid',
      'Las cajas y las unidades deben ser números enteros, cero o más.',
    )
  }
  const total = boxes * boxFactor + units
  if (!fitsInt4(total)) {
    throw new AppError('invalid', 'La cantidad es demasiado grande.')
  }
  return total
}
