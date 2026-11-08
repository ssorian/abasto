import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import {
  orderIdInput,
  pendingsInput,
  receiveOrderInput,
  supplierCostsInput,
  supplierOrderInput,
  supplierOrdersInput,
  writeOffInput,
} from '#/modules/inventory/lib/inventory-inputs'
import {
  cancelSupplierOrder,
  createSupplierOrder,
  getSupplierOrder,
  lastSupplierCosts,
  listSupplierOrders,
  receiveSupplierOrder,
} from '#/modules/inventory/services/supplier-orders'
import {
  listSupplierPendings,
  writeOffPendings,
} from '#/modules/inventory/services/supplier-pendings'

export const createSupplierOrderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      createSupplierOrder(actor, parseInput(supplierOrderInput, data)),
    ),
  )

export const cancelSupplierOrderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      cancelSupplierOrder(actor, parseInput(orderIdInput, data).purchaseId),
    ),
  )

export const receiveSupplierOrderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      receiveSupplierOrder(actor, parseInput(receiveOrderInput, data)),
    ),
  )

export const supplierOrdersFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      listSupplierOrders(actor, parseInput(supplierOrdersInput, data)),
    ),
  )

export const supplierOrderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getSupplierOrder(actor, parseInput(orderIdInput, data).purchaseId),
    ),
  )

export const supplierPendingsFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      listSupplierPendings(actor, parseInput(pendingsInput, data).supplierId),
    ),
  )

export const writeOffPendingsFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      writeOffPendings(actor, parseInput(writeOffInput, data)),
    ),
  )

export const lastSupplierCostsFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      lastSupplierCosts(actor, parseInput(supplierCostsInput, data).supplierId),
    ),
  )
