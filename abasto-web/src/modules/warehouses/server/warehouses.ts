import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { businessDate } from '#/lib/utils/format'
import { warehouseMetrics } from '#/modules/inventory/lib/stock-metrics'
import type { WarehouseMetrics } from '#/modules/inventory/lib/stock-metrics'
import { getWarehouseStock } from '#/modules/inventory/services/stock-reads'
import {
  createWarehouse,
  listWarehouses,
} from '#/modules/warehouses/services/warehouses'
import type { Warehouse } from '#/modules/warehouses/services/warehouses'

const createInput = z.object({ name: z.string() })

export type WarehouseWithMetrics = Warehouse & { metrics: WarehouseMetrics }

export const listWarehousesFn = createServerFn({ method: 'GET' }).handler(() =>
  runWithActor((actor) => listWarehouses(actor)),
)

/** Visible warehouses with their stock metrics derived from the stock read model. */
export const warehouseOverviewFn = createServerFn({ method: 'GET' }).handler(
  () =>
    runWithActor(async (actor): Promise<Array<WarehouseWithMetrics>> => {
      const today = businessDate()
      return Promise.all(
        (await listWarehouses(actor)).map(async (warehouse) => ({
          ...warehouse,
          metrics: warehouseMetrics(
            await getWarehouseStock(actor, warehouse.id),
            today,
          ),
        })),
      )
    }),
)

export const createWarehouseFn = createServerFn({ method: 'POST' })
  .validator((data: { name: string }) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      createWarehouse(actor, parseInput(createInput, data)),
    ),
  )
