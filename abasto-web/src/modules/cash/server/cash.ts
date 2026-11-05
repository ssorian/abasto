import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import {
  cashMovementInput,
  closeCashInput,
  openCashInput,
  warehouseInput,
} from '#/modules/cash/server/cash-inputs'
import {
  recordCashEntry,
  recordCashWithdrawal,
} from '#/modules/cash/services/cash-movements'
import {
  closeCashSession,
  listCashSessions,
  openCashSession,
} from '#/modules/cash/services/cash-sessions'

export const openCashFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      openCashSession(actor, parseInput(openCashInput, data)),
    ),
  )

export const closeCashFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      closeCashSession(actor, parseInput(closeCashInput, data)),
    ),
  )

export const cashEntryFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      recordCashEntry(actor, parseInput(cashMovementInput, data)),
    ),
  )

export const cashWithdrawalFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      recordCashWithdrawal(actor, parseInput(cashMovementInput, data)),
    ),
  )

/** Session history: the service lets only the owner and that warehouse's manager read it. */
export const cashHistoryFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      listCashSessions(actor, parseInput(warehouseInput, data).warehouseId),
    ),
  )
