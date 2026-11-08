import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { parseInput, runBoundary } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import {
  cancelMyOrderInput,
  placeStoreOrderInput,
  storeCartInput,
  storeWarehouseInput,
} from '#/modules/store/lib/storefront-inputs'
import {
  cancelMyOrder,
  getStoreCatalog,
  listMyOrders,
  listStoreWarehouses,
  placeStoreOrder,
  previewStoreCart,
} from '#/modules/store/services/storefront'
import { requireCustomer } from '#/modules/store/services/store-access'
import type { StoreCustomer } from '#/modules/store/services/store-access'

/**
 * Body of every customer server function: resolves the store customer from
 * the request's session, then maps failures to a client-safe `Result`.
 */
function runWithCustomer<T>(
  run: (customer: StoreCustomer) => Promise<T>,
): Promise<Result<T>> {
  return runBoundary(async () =>
    run(await requireCustomer(getRequestHeaders())),
  )
}

/** Public: the warehouses a customer can choose. */
export const storeWarehousesFn = createServerFn({ method: 'GET' }).handler(() =>
  runBoundary(() => listStoreWarehouses()),
)

/** Public: catalog of one warehouse. */
export const storeCatalogFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runBoundary(() =>
      getStoreCatalog(parseInput(storeWarehouseInput, data).warehouseId),
    ),
  )

export const previewStoreCartFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithCustomer((customer) =>
      previewStoreCart(customer, parseInput(storeCartInput, data)),
    ),
  )

export const placeStoreOrderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithCustomer((customer) =>
      placeStoreOrder(customer, parseInput(placeStoreOrderInput, data)),
    ),
  )

export const myOrdersFn = createServerFn({ method: 'GET' }).handler(() =>
  runWithCustomer((customer) => listMyOrders(customer)),
)

export const cancelMyOrderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithCustomer((customer) =>
      cancelMyOrder(customer, parseInput(cancelMyOrderInput, data).orderId),
    ),
  )
