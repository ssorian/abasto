import type { Tx } from '#/modules/inventory/services/stock-ledger'
import type { orders } from '#/modules/orders/db/schema'

/**
 * Payment seam: T8 (cash and credit) decides here whether an order may be
 * picked up. Until then every order passes.
 */
export async function assertPickupAllowed(
  _tx: Tx,
  _order: typeof orders.$inferSelect,
): Promise<void> {}
