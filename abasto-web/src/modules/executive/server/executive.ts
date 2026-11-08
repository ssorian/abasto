import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import {
  getInventoryValue,
  getNonMovingCapital,
} from '#/modules/executive/services/inventory'
import {
  getMarginReport,
  getWarehouseRanking,
} from '#/modules/executive/services/profitability'
import {
  inventoryFiltersInput,
  nonMovingInput,
  periodOnlyInput,
} from '#/modules/reports/server/report-inputs'

// Every service below calls requireOwner, so staff are refused on the server.

const only = (warehouseId?: string) => (warehouseId ? [warehouseId] : undefined)

export const marginReportFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => {
      const input = parseInput(periodOnlyInput, data)
      return getMarginReport(actor, {
        period: input.period,
        warehouseIds: only(input.warehouseId),
        supplierId: input.supplierId,
      })
    }),
  )

export const warehouseRankingFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => {
      const input = parseInput(periodOnlyInput, data)
      return getWarehouseRanking(actor, {
        period: input.period,
        warehouseIds: only(input.warehouseId),
        supplierId: input.supplierId,
      })
    }),
  )

export const inventoryValueFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => {
      const input = parseInput(inventoryFiltersInput, data)
      return getInventoryValue(actor, {
        warehouseIds: only(input.warehouseId),
        supplierId: input.supplierId,
      })
    }),
  )

export const nonMovingCapitalFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => {
      const input = parseInput(nonMovingInput, data)
      return getNonMovingCapital(actor, {
        days: input.days,
        warehouseIds: only(input.warehouseId),
        supplierId: input.supplierId,
      })
    }),
  )
