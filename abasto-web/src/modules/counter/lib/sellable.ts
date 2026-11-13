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

/** One product of the new-order table: its box and its loose-piece presentations. */
export type SellableProduct = {
  productId: string
  productName: string
  sku: string
  imageUrl: string | null
  supplierId: string | null
  supplierName: string | null
  /** Base unit in plural ("piezas"). */
  unit: string
  /** Base units still available, shared by every presentation. */
  availableBase: number
  /** Biggest priced presentation of more than one piece; null when there is none. */
  box: SellableOption | null
  /** Priced presentation of exactly one piece; null when there is none. */
  piece: SellableOption | null
}

/** Groups presentations into one row per product, in first-seen order. */
export function groupSellable(
  options: ReadonlyArray<SellableOption>,
): Array<SellableProduct> {
  const byProduct = new Map<string, SellableProduct>()
  for (const option of options) {
    const group = byProduct.get(option.productId) ?? {
      productId: option.productId,
      productName: option.productName,
      sku: option.sku,
      imageUrl: option.imageUrl,
      supplierId: option.supplierId,
      supplierName: option.supplierName,
      unit: option.unit,
      availableBase: option.availableBase,
      box: null,
      piece: null,
    }
    if (option.factor === 1) group.piece ??= option
    else if (!group.box || option.factor > group.box.factor) group.box = option
    byProduct.set(option.productId, group)
  }
  return [...byProduct.values()]
}

export type SellableFilter = {
  /** Name or SKU, case- and accent-insensitive. */
  query: string
  /** Supplier id; empty means every supplier. */
  supplierId: string
  /** When set, only these products (the ones already in the order). */
  onlyIds?: ReadonlySet<string>
}

type Filterable = {
  productId: string
  productName: string
  sku: string
  supplierId: string | null
}

/** Rows the new-order table shows for the current search and filters. */
export function filterSellable<T extends Filterable>(
  options: ReadonlyArray<T>,
  { query, supplierId, onlyIds }: SellableFilter,
): Array<T> {
  const needle = normalize(query.trim())
  return options.filter(
    (option) =>
      (!supplierId || option.supplierId === supplierId) &&
      (!onlyIds || onlyIds.has(option.productId)) &&
      (!needle ||
        normalize(option.productName).includes(needle) ||
        normalize(option.sku).includes(needle)),
  )
}

/** Suppliers with something to sell, once each and by name, for the supplier filter. */
export function sellableSuppliers(
  options: ReadonlyArray<Pick<SellableOption, 'supplierId' | 'supplierName'>>,
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

/** Availability of a product row: whole boxes and loose pieces, plus the pieces behind them. */
export function productAvailabilityLabel(product: SellableProduct): string {
  const pieces = countLabel(product.availableBase, product.unit)
  if (!product.box || product.availableBase === 0)
    return `Disponible: ${pieces}`
  const boxes = Math.floor(product.availableBase / product.box.factor)
  const loose = product.availableBase % product.box.factor
  const parts = [countLabel(boxes, product.box.presentationName)]
  if (loose) parts.push(countLabel(loose, product.unit))
  return `Disponible: ${parts.join(' y ')} (${pieces})`
}
