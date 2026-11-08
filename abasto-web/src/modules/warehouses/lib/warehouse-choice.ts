/**
 * Whether the user has a warehouse to choose. Lists come already scoped by
 * the server (staff: their assignments; owner: every warehouse), so a user
 * with a single warehouse works in it without any selector.
 */
export function hasWarehouseChoice(
  warehouses: ReadonlyArray<{ id: string }>,
): boolean {
  return warehouses.length > 1
}
