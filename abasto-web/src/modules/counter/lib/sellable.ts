export type PriceInfo = {
  presentationId: string
  productId: string
  productName: string
  presentationName: string
  factor: number
  priceCents: number | null
}

export type SellableOption = {
  presentationId: string
  label: string
  productId: string
  /** Base units (pieces) in one presentation. */
  factor: number
  /** "Caja", "Pieza": what one presentation is called. */
  presentationName: string
  /** Name of the base unit in plural ("piezas"). */
  unit: string
  priceCents: number
  /** Whole presentations that can still be reserved. */
  available: number
  /** Base units of the product still available, shared by all its presentations. */
  availableBase: number
}

/** Priced presentations with the whole units available (base units ÷ factor). */
export function buildSellable(
  prices: ReadonlyArray<PriceInfo>,
  stock: ReadonlyArray<{
    productId: string
    available: number
    unit: string
  }>,
): Array<SellableOption> {
  const availableOf = new Map(stock.map((s) => [s.productId, s.available]))
  const unitOf = new Map(stock.map((s) => [s.productId, s.unit]))
  return prices.flatMap((price) =>
    price.priceCents === null
      ? []
      : [
          {
            presentationId: price.presentationId,
            label: `${price.productName} · ${price.presentationName}`,
            productId: price.productId,
            factor: price.factor,
            presentationName: price.presentationName,
            unit: unitOf.get(price.productId) ?? 'piezas',
            priceCents: price.priceCents,
            available: Math.floor(
              (availableOf.get(price.productId) ?? 0) / price.factor,
            ),
            availableBase: availableOf.get(price.productId) ?? 0,
          },
        ],
  )
}

/**
 * Singular of a unit noun: "unidades" → "unidad", "contenedores" →
 * "contenedor", "cartones" → "cartón", "sobres" → "sobre", "cajas" → "caja".
 * Only endings whose singular never ends in "-e" drop "-es"; the rest drop "-s".
 */
function singular(word: string): string {
  if (/dades$/.test(word) || /ores$/.test(word)) return word.slice(0, -2)
  if (/ones$/.test(word)) return `${word.slice(0, -4)}ón`
  return word.endsWith('s') ? word.slice(0, -1) : word
}

/** "1 pieza", "9 cajas": the noun agrees with the count; any case in, lower case out. */
export function countLabel(count: number, noun: string): string {
  const word = noun.trim().toLowerCase()
  if (count === 1) return `1 ${singular(word)}`
  const plural = /[sx]$/.test(word)
    ? word
    : /[aeiouáéíóú]$/.test(word)
      ? `${word}s`
      : `${word}es`
  return `${count} ${plural}`
}

/**
 * Availability in the unit the line is requested in (its presentation), with
 * the base units behind it when the presentation is bigger than one unit.
 */
export function availabilityLabel(option: SellableOption): string {
  const inPresentations = countLabel(option.available, option.presentationName)
  return option.factor === 1
    ? `Disponible: ${countLabel(option.availableBase, option.unit)}`
    : `Disponible: ${inPresentations} (${countLabel(option.availableBase, option.unit)})`
}
