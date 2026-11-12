import { normalize } from '#/modules/inventory/lib/format'

export type PriceInfo = {
  presentationId: string
  productId: string
  productName: string
  sku: string
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
  productName: string
  sku: string
  /** Catalog photo; null when the product has none. */
  imageUrl: string | null
  supplierId: string | null
  supplierName: string | null
}

/** Product facts the stock read carries beyond availability. */
type StockInfo = {
  productId: string
  available: number
  unit: string
  imageUrl?: string | null
  supplierId?: string | null
  supplierName?: string | null
}

/** Priced presentations with the whole units available (base units ÷ factor). */
export function buildSellable(
  prices: ReadonlyArray<PriceInfo>,
  stock: ReadonlyArray<StockInfo>,
): Array<SellableOption> {
  const stockOf = new Map(stock.map((s) => [s.productId, s]))
  const availableOf = new Map(stock.map((s) => [s.productId, s.available]))
  const unitOf = new Map(stock.map((s) => [s.productId, s.unit]))
  return prices.flatMap((price) => {
    const product = stockOf.get(price.productId)
    return price.priceCents === null
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
            productName: price.productName,
            sku: price.sku,
            imageUrl: product?.imageUrl ?? null,
            supplierId: product?.supplierId ?? null,
            supplierName: product?.supplierName ?? null,
          },
        ]
  })
}

export type SellableFilter = {
  /** Name or SKU, case- and accent-insensitive. */
  query: string
  /** Supplier id; empty means every supplier. */
  supplierId: string
  /** When set, only these presentations (the ones already in the order). */
  onlyIds?: ReadonlySet<string>
}

/** Options the new-order table shows for the current search and filters. */
export function filterSellable(
  options: ReadonlyArray<SellableOption>,
  { query, supplierId, onlyIds }: SellableFilter,
): Array<SellableOption> {
  const needle = normalize(query.trim())
  return options.filter(
    (option) =>
      (!supplierId || option.supplierId === supplierId) &&
      (!onlyIds || onlyIds.has(option.presentationId)) &&
      (!needle ||
        normalize(option.productName).includes(needle) ||
        normalize(option.sku).includes(needle)),
  )
}

/** Suppliers with something to sell, once each and by name, for the supplier filter. */
export function sellableSuppliers(
  options: ReadonlyArray<SellableOption>,
): Array<{ id: string; name: string; active: boolean }> {
  const byId = new Map<string, string>()
  for (const { supplierId, supplierName } of options) {
    if (supplierId && supplierName) byId.set(supplierId, supplierName)
  }
  return [...byId]
    .map(([id, name]) => ({ id, name, active: true }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
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
