import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'

const MAX_CENTS = 2_147_483_647

const pesos = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

/** `+ 0` turns a negative zero into 0, so nothing prints "-$0.00". */
export const formatCents = (cents: number) => pesos.format(cents / 100 + 0)

/** Pesos typed by the user → integer cents; works on digits so no float drift. */
export function parsePesosToCents(
  text: string,
  { allowZero = false }: { allowZero?: boolean } = {},
): Parsed<number> {
  const clean = text.replace(/[\s$]/g, '')
  if (!clean) return fail('Escribe un monto.')
  if (clean.includes(','))
    return fail('Usa punto para los decimales, sin comas.')
  const match = /^(\d+)(?:\.(\d+))?$/.exec(clean)
  if (!match) return fail('Escribe solo números, por ejemplo 438.50.')
  const [, whole, fraction = ''] = match
  if (fraction.length > 2) return fail('Usa máximo 2 decimales.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) {
    return fail('El monto es demasiado grande.')
  }
  if (cents === 0 && !allowZero)
    return fail('El monto debe ser mayor que cero.')
  return { ok: true, value: cents }
}
