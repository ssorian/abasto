import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { can } from '#/modules/access/lib/policy'
import {
  bulkChangeInput,
  historyInput,
  marginInput,
  pricingOverviewInput,
  setPricesInput,
} from '#/modules/pricing/lib/pricing-inputs'
import { bulkChangePrices } from '#/modules/pricing/services/bulk-prices'
import {
  getProductMargin,
  setProductMargin,
} from '#/modules/pricing/services/margins'
import {
  getPriceHistory,
  listWarehousePrices,
} from '#/modules/pricing/services/price-reads'
import { setPrices } from '#/modules/pricing/services/prices'
import { listWarehouses } from '#/modules/warehouses/services/warehouses'

/** Warehouses the actor sees, flagged with whether they may change prices there. */
export const pricingOverviewFn = createServerFn({ method: 'GET' })
  .validator((data: { warehouseId?: string }) => data)
  .handler(({ data }) =>
    runWithActor(async (actor) => {
      const { warehouseId } = parseInput(pricingOverviewInput, data)
      const visible = await listWarehouses(actor)
      const warehouses = visible.map((warehouse) => ({
        ...warehouse,
        canManage: can(actor, 'warehouse.manage', warehouse.id),
      }))
      const selected =
        warehouses.find(({ id }) => id === warehouseId) ?? warehouses.at(0)
      const rows = selected ? await listWarehousePrices(actor, selected.id) : []
      // Target margins are owner-only (`catalog.manage`).
      const productIds = [...new Set(rows.map((row) => row.productId))]
      const margins =
        actor.role === 'owner'
          ? Object.fromEntries(
              await Promise.all(
                productIds.map(
                  async (id) =>
                    [id, await getProductMargin(actor, id)] as const,
                ),
              ),
            )
          : null
      return { warehouses, selectedId: selected?.id ?? null, rows, margins }
    }),
  )

export const setPricesFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => setPrices(actor, parseInput(setPricesInput, data))),
  )

export const bulkChangePricesFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      bulkChangePrices(actor, parseInput(bulkChangeInput, data)),
    ),
  )

export const setMarginFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      setProductMargin(actor, parseInput(marginInput, data)),
    ),
  )

export const priceHistoryFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getPriceHistory(actor, parseInput(historyInput, data)),
    ),
  )
