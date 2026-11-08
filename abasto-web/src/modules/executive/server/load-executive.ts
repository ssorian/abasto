import { ClientError, unwrap } from '#/lib/boundary'
import { defaultNonMovingDays } from '#/modules/executive/lib/search'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import {
  inventoryValueFn,
  marginReportFn,
  nonMovingCapitalFn,
  warehouseRankingFn,
} from '#/modules/executive/server/executive'
import type {
  InventoryValue,
  NonMovingCapital,
} from '#/modules/executive/types/inventory'
import type {
  MarginReport,
  WarehouseRanking,
} from '#/modules/executive/types/profitability'
import { periodOf } from '#/modules/reports/lib/search'

export type ExecutiveLoad =
  | { allowed: false }
  | {
      allowed: true
      margin?: MarginReport
      ranking?: WarehouseRanking
      inventory?: InventoryValue
      nonMoving?: NonMovingCapital
      /** Set when the period was refused (bad dates); `error` says why. */
      error?: string
    }

/** Loads the console; staff get `allowed: false` without any server call. */
export async function loadExecutive(
  search: ExecutiveSearch,
  isOwner: boolean,
): Promise<ExecutiveLoad> {
  if (!isOwner) return { allowed: false }
  const input = { period: periodOf(search) }
  try {
    const [margin, ranking, inventory, nonMoving] = await Promise.all([
      marginReportFn({ data: input }),
      warehouseRankingFn({ data: input }),
      inventoryValueFn(),
      nonMovingCapitalFn({
        data: { days: search.sinventa ?? defaultNonMovingDays },
      }),
    ])
    return {
      allowed: true,
      margin: unwrap(margin),
      ranking: unwrap(ranking),
      inventory: unwrap(inventory),
      nonMoving: unwrap(nonMoving),
    }
  } catch (error) {
    if (error instanceof ClientError && error.code === 'forbidden') {
      return { allowed: false }
    }
    if (error instanceof ClientError && error.code === 'invalid') {
      return { allowed: true, error: error.message }
    }
    throw error
  }
}
