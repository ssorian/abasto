export type Parsed =
  { ok: true; value: number } | { ok: false; message: string }

const maxCents = 2_147_483_647
const pesos = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

/** `+ 0` turns a negative zero into 0, so nothing prints "-$0.00". */
export const formatCents = (cents: number) => pesos.format(cents / 100 + 0)

/** Basis points as a percent without trailing zeros: 1250 → "12.5". */
export const formatBps = (bps: number) => String(bps / 100)

const fail = (message: string): Parsed => ({ ok: false, message })

/** Digits only, so no float arithmetic touches the amount. */
function parseScaled(text: string, signed: boolean, decimalsMessage: string) {
  const clean = text.replace(/[\s$%]/g, '')
  if (!clean) return fail('Escribe un monto.')
  if (clean.includes(','))
    return fail('Usa punto para los decimales, sin comas.')
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(clean)
  if (!match) return fail('Escribe solo números, por ejemplo 438.50.')
  const [, sign, whole, fraction = ''] = match
  if (sign && !signed) return fail('El monto no puede ser negativo.')
  if (fraction.length > 2) return fail(decimalsMessage)
  const magnitude = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(magnitude) || magnitude > maxCents) {
    return fail('El monto es demasiado grande.')
  }
  return { ok: true, value: sign === '-' ? -magnitude : magnitude } as Parsed
}

const decimals = 'Usa máximo 2 decimales.'

/** Pesos typed by the user → positive integer cents ("438.00" → 43800). */
export function parsePesos(text: string): Parsed {
  const parsed = parseScaled(text, false, decimals)
  if (parsed.ok && parsed.value === 0) {
    return fail('El precio debe ser mayor que cero.')
  }
  return parsed
}

/** Signed pesos ("-2.50" → -250). */
export const parseSignedPesos = (text: string): Parsed =>
  parseScaled(text, true, decimals)

/** Signed percent → basis points ("12.5" → 1250). */
export const parseBps = (text: string): Parsed =>
  parseScaled(text, true, 'Usa máximo 2 decimales en el porcentaje.')
