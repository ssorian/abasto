import { parseBoxCount } from '#/modules/inventory/lib/box-count'

/** Stock of a product in the receiving warehouse, in base units (pieces). */
export type OrderStock = { available: number; minimum: number }

/** Stock by product id; undefined while it loads, a missing id means no stock. */
export type OrderStockByProduct = Readonly<Partial<Record<string, OrderStock>>>

/** Pieces → whole boxes plus leftover pieces; a factor below one counts pieces as boxes. */
export function splitIntoBoxes(pieces: number, factor: number) {
  if (factor < 2) return { boxes: pieces, pieces: 0 }
  return { boxes: Math.floor(pieces / factor), pieces: pieces % factor }
}

/** Packs of an order: boxes, or pieces for a product sold piece by piece. */
export function boxCountLabel(count: number, factor: number) {
  const [one, many] = factor < 2 ? ['pieza', 'piezas'] : ['caja', 'cajas']
  return `${count} ${count === 1 ? one : many}`
}

/** "3 cajas", "3 cajas + 4 pz", "5 pz" (less than a box) or "0 cajas"; piece-based: "5 piezas". */
export function stockLabel(pieces: number, factor: number) {
  const split = splitIntoBoxes(pieces, factor)
  if (!split.pieces) return boxCountLabel(split.boxes, factor)
  if (!split.boxes) return `${split.pieces} pz`
  return `${boxCountLabel(split.boxes, factor)} + ${split.pieces} pz`
}

/** Below a set minimum, counting sellable stock (same rule as the stock tab). */
export const isBelowMinimum = (stock: OrderStock | undefined) =>
  stock !== undefined && stock.minimum > 0 && stock.available < stock.minimum

/** "Bajo mínimo (5 cajas)", or null when the product is not below its minimum. */
export function belowMinimumLabel(
  stock: OrderStock | undefined,
  factor: number,
) {
  return stock && isBelowMinimum(stock)
    ? `Bajo mínimo (${stockLabel(stock.minimum, factor)})`
    : null
}

/** Rows below their minimum first; the rest keep their order. */
export function sortBelowMinimumFirst<T extends { id: string }>(
  products: ReadonlyArray<T>,
  stock: OrderStockByProduct | undefined,
): Array<T> {
  const rank = (product: T) => (isBelowMinimum(stock?.[product.id]) ? 0 : 1)
  return [...products].sort((a, b) => rank(a) - rank(b))
}

/** Rows with at least one box typed. */
export function onlyWithBoxes<T extends { id: string }>(
  products: ReadonlyArray<T>,
  boxes: Readonly<Record<string, string | undefined>>,
): Array<T> {
  return products.filter((product) => {
    const parsed = parseBoxCount(boxes[product.id] ?? '')
    return parsed.ok && parsed.value > 0
  })
}
