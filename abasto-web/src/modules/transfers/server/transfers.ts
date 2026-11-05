import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { can } from '#/modules/access/lib/policy'
import {
  cancelInput,
  dispatchInput,
  receiveInput,
  transfersOverviewInput,
} from '#/modules/transfers/lib/transfer-inputs'
import { cancelTransfer } from '#/modules/transfers/services/transfer-cancel'
import { dispatchTransfer } from '#/modules/transfers/services/transfer-dispatch'
import {
  listTransferDestinations,
  listWarehouseTransfers,
} from '#/modules/transfers/services/transfer-reads'
import { receiveTransfer } from '#/modules/transfers/services/transfer-receive'
import type { TransfersOverview } from '#/modules/transfers/types/transfers'

/** Transfers in and out of a warehouse, plus where its managers can send to. */
export const transfersOverviewFn = createServerFn({ method: 'GET' })
  .validator((data: { warehouseId: string }) => data)
  .handler(({ data }) =>
    runWithActor(async (actor): Promise<TransfersOverview> => {
      const { warehouseId } = parseInput(transfersOverviewInput, data)
      const transfers = await listWarehouseTransfers(actor, warehouseId)
      const destinations = can(actor, 'warehouse.manage', warehouseId)
        ? await listTransferDestinations(actor, warehouseId)
        : []
      return { transfers, destinations }
    }),
  )

export const dispatchTransferFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      dispatchTransfer(actor, parseInput(dispatchInput, data)),
    ),
  )

export const receiveTransferFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      receiveTransfer(actor, parseInput(receiveInput, data)),
    ),
  )

export const cancelTransferFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      cancelTransfer(actor, parseInput(cancelInput, data)),
    ),
  )
