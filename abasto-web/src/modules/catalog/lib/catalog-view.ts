export type CatalogView = 'table' | 'cards'

export const defaultCatalogView: CatalogView = 'table'

export const catalogViewKey = 'abasto.catalog.view'

/** A stored value as a view; anything unknown falls back to the default. */
export function catalogViewOf(stored: string | null): CatalogView {
  return stored === 'cards' || stored === 'table' ? stored : defaultCatalogView
}

/** The once-per-page inventory note; names the unit only when all products share it. */
export function inventoryNote(products: ReadonlyArray<{ unit: string }>) {
  const units = new Set(products.map(({ unit }) => unit))
  return units.size === 1
    ? `El inventario se lleva en ${[...units][0]}.`
    : 'El inventario se lleva en la unidad base de cada producto.'
}
