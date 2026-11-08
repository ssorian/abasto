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
  nonMovingInput,
  periodOnlyInput,
} from '#/modules/reports/server/report-inputs'

// Every service below calls requireOwner, so staff are refused on the server.

export const marginReportFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getMarginReport(actor, parseInput(periodOnlyInput, data)),
    ),
  )

export const warehouseRankingFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getWarehouseRanking(actor, parseInput(periodOnlyInput, data)),
    ),
  )

export const inventoryValueFn = createServerFn({ method: 'GET' }).handler(() =>
  runWithActor((actor) => getInventoryValue(actor)),
)

export const nonMovingCapitalFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getNonMovingCapital(actor, parseInput(nonMovingInput, data)),
    ),
  )
