import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'

/** Largest quantity the database accepts (int4). */
export const MAX_QUANTITY = 2_147_483_647

/** Whole number typed by the user; blank counts as zero. */
export function parseWholeNumber(text: string): Parsed<number> {
  const clean = text.trim()
  if (!clean) return { ok: true, value: 0 }
  if (!/^\d+$/.test(clean)) {
    return fail('Escribe cantidades enteras, sin decimales ni signos.')
  }
  const value = Number(clean)
  if (value > MAX_QUANTITY) return fail('La cantidad es demasiado grande.')
  return { ok: true, value }
}

type Entered = {
  /** Packs typed, in the chosen presentation. */
  packs: string
  /** Base units per pack of that presentation. */
  factor: number
  /** Loose base units typed. */
  loose: string
}

/** Packs plus loose units → base units, validated against the database limit. */
export function toBaseUnits(
  { packs, factor, loose }: Entered,
  { allowZero = false }: { allowZero?: boolean } = {},
): Parsed<number> {
  const packCount = parseWholeNumber(packs)
  if (!packCount.ok) return packCount
  const looseCount = parseWholeNumber(loose)
  if (!looseCount.ok) return looseCount
  const total = packCount.value * factor + looseCount.value
  if (total > MAX_QUANTITY) return fail('La cantidad es demasiado grande.')
  if (total === 0 && !allowZero) {
    return fail('La cantidad debe ser mayor que cero.')
  }
  return { ok: true, value: total }
}

export function splitBaseUnits(quantity: number, factor: number) {
  return {
    packs: Math.floor(quantity / factor),
    loose: quantity % factor,
  }
}

/** How a product is counted on screen: its default presentation and base unit. */
export type PackInfo = { packName: string; factor: number; unit: string }

const singulars: Record<string, string> = {
  cajas: 'caja',
  piezas: 'pieza',
  bultos: 'bulto',
  paquetes: 'paquete',
}
const plurals = Object.fromEntries(
  Object.entries(singulars).map(([plural, one]) => [one, plural]),
)

/** Presentation names arrive as `Caja` or `cajas`; print them as a counted noun. */
function countedNoun(name: string, count: number): string {
  const word = name.toLowerCase()
  const one = singulars[word] ?? word
  if (count === 1) return one
  return plurals[one] ?? pluralize(word)
}

/** Pluralizes one plain Spanish word; anything else is printed as given. */
const pluralize = (word: string) => {
  if (!/^[a-záéíóúñ]+$/.test(word) || word.endsWith('s')) return word
  return /[aeiou]$/.test(word) ? `${word}s` : `${word}es`
}

/** `3 cajas + 5 piezas`; negative quantities lead with a minus sign. */
export function formatQuantity(quantity: number, pack: PackInfo): string {
  const sign = quantity < 0 ? '−' : ''
  const { packs, loose } = splitBaseUnits(Math.abs(quantity), pack.factor)
  const parts: Array<string> = []
  if (pack.factor > 1 && packs > 0) {
    parts.push(`${packs} ${countedNoun(pack.packName, packs)}`)
  }
  const units = pack.factor > 1 ? loose : packs + loose
  if (units > 0 || !parts.length) {
    parts.push(`${units} ${countedNoun(pack.unit, units)}`)
  }
  return `${sign}${parts.join(' + ')}`
}
