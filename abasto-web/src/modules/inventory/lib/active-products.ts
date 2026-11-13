/**
 * Archived products keep resolving in history (labels, search) but are not
 * offered in pickers or new-work dialogs.
 */
export function activeProducts<T extends { archivedAt?: Date | string | null }>(
  products: ReadonlyArray<T>,
): Array<T> {
  return products.filter((product) => !product.archivedAt)
}
