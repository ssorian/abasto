import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { can } from '#/modules/access/lib/policy'
import {
  historyInput,
  pricingOverviewInput,
  setPricesInput,
} from '#/modules/pricing/lib/pricing-inputs'
import {
  getPriceHistory,
  listWarehousePrices,
} from '#/modules/pricing/services/price-reads'
import { setPrices } from '#/modules/pricing/services/prices'
import { listWarehouses } from '#/modules/warehouses/services/warehouses'

/** Warehouses the actor sees, flagged with whether they may change prices there. */
export const pricingOverviewFn = createServerFn({ method: 'GET' })
  .validator((data: { warehouseId?: string }) => data)
  .handler(({ data }) => {
    // Stable URL per warehouse: never let the browser replay a pre-save read.
    setResponseHeader('Cache-Control', 'no-store')
    return runWithActor(async (actor) => {
      const { warehouseId } = parseInput(pricingOverviewInput, data)
      const visible = await listWarehouses(actor)
      const warehouses = visible.map((warehouse) => ({
        ...warehouse,
        canManage: can(actor, 'warehouse.manage', warehouse.id),
      }))
      const selected =
        warehouses.find(({ id }) => id === warehouseId) ?? warehouses.at(0)
      const rows = selected ? await listWarehousePrices(actor, selected.id) : []
      return { warehouses, selectedId: selected?.id ?? null, rows }
    })
  })

export const setPricesFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => setPrices(actor, parseInput(setPricesInput, data))),
  )

export const priceHistoryFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) => {
    setResponseHeader('Cache-Control', 'no-store')
    return runWithActor((actor) =>
      getPriceHistory(actor, parseInput(historyInput, data)),
    )
  })
