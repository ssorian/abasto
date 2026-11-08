import type { Parsed } from '#/modules/pricing/lib/money'

/** Supplier amounts are integers in ten-thousandths of a peso (1.2055 → 12055). */
export const maxTenThousandths = 2_147_483_647

/** Pesos typed with up to 4 decimals → ten-thousandths; blank means zero. */
export function parseTenThousandths(text: string): Parsed {
  const clean = text.replace(/[\s$]/g, '')
  if (!clean) return { ok: true, value: 0 }
  if (clean.includes(',')) {
    return { ok: false, message: 'Usa punto para los decimales, sin comas.' }
  }
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(clean)
  if (!match) {
    return {
      ok: false,
      message: 'Escribe solo números, por ejemplo 12.5000.',
    }
  }
  const [, sign, whole, fraction = ''] = match
  if (sign) return { ok: false, message: 'El monto no puede ser negativo.' }
  if (fraction.length > 4) {
    return { ok: false, message: 'Usa máximo 4 decimales.' }
  }
  const value = Number(whole) * 10_000 + Number(fraction.padEnd(4, '0'))
  if (!Number.isSafeInteger(value) || value > maxTenThousandths) {
    return { ok: false, message: 'El monto es demasiado grande.' }
  }
  return { ok: true, value }
}

/** Ten-thousandths as pesos with 4 decimals: 840 → "0.0840". */
export function formatTenThousandths(value: number): string {
  const whole = Math.trunc(value / 10_000)
  const fraction = String(value % 10_000).padStart(4, '0')
  return `${whole}.${fraction}`
}

/** List price minus fixed discount minus promotion, in ten-thousandths. */
export const netCostPerPiece = (
  listPrice: number,
  fixedDiscount: number,
  promotion: number,
) => listPrice - fixedDiscount - promotion

/** Net cost per box in integer cents: piece cost × pieces per box, rounded half up. */
export function netCostPerBoxCents(netPerPiece: number, factor: number) {
  const total = BigInt(netPerPiece) * BigInt(factor)
  return Number((total + 50n) / 100n)
}
