import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { can } from '#/modules/access/lib/policy'
import {
  adjustInput,
  applyPricesInput,
  countInput,
  lossInput,
  minimumInput,
  overviewInput,
  purchaseInput,
  suggestionsInput,
} from '#/modules/inventory/lib/inventory-inputs'
import { withProducts } from '#/modules/inventory/server/movement-products'
import { createPurchase } from '#/modules/inventory/services/purchases'
import {
  adjustLot,
  registerLoss,
} from '#/modules/inventory/services/stock-adjustments'
import { countStock } from '#/modules/inventory/services/stock-counts'
import { setMinimumStock } from '#/modules/inventory/services/stock-minimums'
import {
  getWarehouseStock,
  listStockMovements,
} from '#/modules/inventory/services/stock-reads'
import type { InventoryOverview } from '#/modules/inventory/types/stock'
import {
  applySuggestedPrices,
  suggestPurchasePrices,
} from '#/modules/pricing/services/price-suggestions'
import { listWarehouses } from '#/modules/warehouses/services/warehouses'
import { businessDate } from '#/lib/utils/format'

/** How many ledger rows the Movimientos tab loads. */
const MOVEMENT_LIMIT = 200

/** Visible warehouses, the selected one's stock and its latest movements. */
export const inventoryOverviewFn = createServerFn({ method: 'GET' })
  .validator((data: { warehouseId?: string }) => data)
  .handler(({ data }) =>
    runWithActor(async (actor): Promise<InventoryOverview> => {
      const { warehouseId } = parseInput(overviewInput, data)
      const warehouses = (await listWarehouses(actor)).map((warehouse) => ({
        ...warehouse,
        canManage: can(actor, 'warehouse.manage', warehouse.id),
      }))
      const selected =
        warehouses.find(({ id }) => id === warehouseId) ?? warehouses.at(0)
      const today = businessDate()
      if (!selected) {
        return { warehouses, selectedId: null, today, stock: [], movements: [] }
      }
      const [stock, movements] = await Promise.all([
        getWarehouseStock(actor, selected.id),
        listStockMovements(actor, {
          warehouseId: selected.id,
          limit: MOVEMENT_LIMIT,
        }),
      ])
      return {
        warehouses,
        selectedId: selected.id,
        today,
        stock,
        movements: await withProducts(movements),
      }
    }),
  )

export const createPurchaseFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      createPurchase(actor, parseInput(purchaseInput, data)),
    ),
  )

export const suggestPricesFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      suggestPurchasePrices(
        actor,
        parseInput(suggestionsInput, data).purchaseId,
      ),
    ),
  )

export const applyPricesFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      applySuggestedPrices(actor, parseInput(applyPricesInput, data)),
    ),
  )

export const setMinimumFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      setMinimumStock(actor, parseInput(minimumInput, data)),
    ),
  )

export const adjustLotFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => adjustLot(actor, parseInput(adjustInput, data))),
  )

export const registerLossFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => registerLoss(actor, parseInput(lossInput, data))),
  )

export const countStockFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => countStock(actor, parseInput(countInput, data))),
  )
