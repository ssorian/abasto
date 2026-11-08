/** Store carts: one list of lines per warehouse, kept in localStorage. */
export type CartLine = { presentationId: string; quantity: number }
export type Carts = Record<string, Array<CartLine>>

export const CART_STORAGE_KEY = 'abasto.store.carts'
export const MAX_LINE_QUANTITY = 999

const isQuantity = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0

const clamp = (quantity: number) => Math.min(quantity, MAX_LINE_QUANTITY)

const withLines = (
  carts: Carts,
  warehouseId: string,
  lines: Array<CartLine>,
): Carts => {
  const { [warehouseId]: _previous, ...rest } = carts
  return lines.length ? { ...rest, [warehouseId]: lines } : rest
}

export const linesOf = (carts: Carts, warehouseId: string): Array<CartLine> =>
  carts[warehouseId] ?? []

/** Units in one warehouse's cart. */
export const cartCount = (carts: Carts, warehouseId: string) =>
  linesOf(carts, warehouseId).reduce((sum, line) => sum + line.quantity, 0)

export function addToCart(
  carts: Carts,
  warehouseId: string,
  presentationId: string,
  quantity: number,
): Carts {
  if (!isQuantity(quantity)) return carts
  const lines = linesOf(carts, warehouseId)
  const found = lines.some((line) => line.presentationId === presentationId)
  return withLines(
    carts,
    warehouseId,
    found
      ? lines.map((line) =>
          line.presentationId === presentationId
            ? { ...line, quantity: clamp(line.quantity + quantity) }
            : line,
        )
      : [...lines, { presentationId, quantity: clamp(quantity) }],
  )
}

/** Sets the quantity of an existing line; zero or less removes it. */
export function setCartQuantity(
  carts: Carts,
  warehouseId: string,
  presentationId: string,
  quantity: number,
): Carts {
  const lines = linesOf(carts, warehouseId)
  if (!lines.some((line) => line.presentationId === presentationId)) {
    return carts
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return removeFromCart(carts, warehouseId, presentationId)
  }
  return withLines(
    carts,
    warehouseId,
    lines.map((line) =>
      line.presentationId === presentationId
        ? { ...line, quantity: clamp(quantity) }
        : line,
    ),
  )
}

export const removeFromCart = (
  carts: Carts,
  warehouseId: string,
  presentationId: string,
): Carts =>
  withLines(
    carts,
    warehouseId,
    linesOf(carts, warehouseId).filter(
      (line) => line.presentationId !== presentationId,
    ),
  )

export const clearCart = (carts: Carts, warehouseId: string): Carts =>
  withLines(carts, warehouseId, [])

export const serializeCarts = (carts: Carts) => JSON.stringify(carts)

/** Reads stored carts; anything malformed is dropped, never thrown. */
export function parseCarts(raw: string | null): Carts {
  if (!raw) return {}
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {}
  }
  const carts: Carts = {}
  for (const [warehouseId, value] of Object.entries(data)) {
    if (!Array.isArray(value)) continue
    const lines: Array<CartLine> = []
    for (const item of value as Array<unknown>) {
      if (typeof item !== 'object' || item === null) continue
      const { presentationId, quantity } = item as Record<string, unknown>
      if (typeof presentationId === 'string' && isQuantity(quantity)) {
        lines.push({ presentationId, quantity: clamp(quantity) })
      }
    }
    if (lines.length) carts[warehouseId] = lines
  }
  return carts
}
