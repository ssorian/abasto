import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'

const WHOLE = /^\d+$/

/** Whole boxes typed by the user; blank means zero. */
export function parseBoxCount(text: string): Parsed<number> {
  const clean = text.trim()
  if (!clean) return { ok: true, value: 0 }
  if (!WHOLE.test(clean)) return fail('Escribe un número entero de cajas.')
  const value = Number(clean)
  return Number.isSafeInteger(value)
    ? { ok: true, value }
    : fail('Las cajas son demasiadas.')
}

/** Keeps only the digits of a typed or pasted box count, e.g. "12abc" → "12". */
export const digitsOnly = (text: string) => text.replace(/\D/g, '')
