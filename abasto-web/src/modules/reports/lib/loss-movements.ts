import type { LossMovement } from '#/modules/reports/types/reports'

/**
 * Losses come from the inventory ledger (manual exits, negative adjustments, transfer
 * shortages). The reference starts without any and this module cannot register them, so
 * the report shows its empty state until the inventory module supplies movements.
 */
export const lossMovements: ReadonlyArray<LossMovement> = []
