/** A dialog another screen asks Inventario to open, e.g. from an Inicio alert. */
export type InventoryAction =
  | { kind: 'quitar'; productId: string; lotId: string }
  | { kind: 'pedido'; productId: string }

const text = (value: unknown) =>
  typeof value === 'string' && value !== '' ? value : undefined

/** Reads `accion`, `producto` and `lote` from the URL; anything incomplete is no action. */
export function inventoryActionOf(
  search: Record<string, unknown>,
): InventoryAction | undefined {
  const productId = text(search.producto)
  if (!productId) return undefined
  if (search.accion === 'pedido') return { kind: 'pedido', productId }
  const lotId = text(search.lote)
  if (search.accion === 'quitar' && lotId) {
    return { kind: 'quitar', productId, lotId }
  }
  return undefined
}
