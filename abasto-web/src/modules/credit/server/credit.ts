import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import {
  abonoInput,
  authorizationIdInput,
  customerIdInput,
  receivablesInput,
} from '#/modules/credit/server/credit-inputs'
import { getReceivables } from '#/modules/credit/server/receivables'
import {
  approveCreditAuthorization,
  rejectCreditAuthorization,
} from '#/modules/credit/services/credit-authorizations'
import {
  getCustomerBalance,
  getCustomerStatement,
  recordAbono,
} from '#/modules/credit/services/customer-ledger'

export const receivablesFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getReceivables(actor, parseInput(receivablesInput, data).warehouseId),
    ),
  )

export const customerBalanceFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getCustomerBalance(actor, parseInput(customerIdInput, data).customerId),
    ),
  )

export const customerStatementFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getCustomerStatement(actor, parseInput(customerIdInput, data).customerId),
    ),
  )

export const recordAbonoFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => recordAbono(actor, parseInput(abonoInput, data))),
  )

/** The service itself refuses anyone but the owner. */
export const approveAuthorizationFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      approveCreditAuthorization(
        actor,
        parseInput(authorizationIdInput, data).authorizationId,
      ),
    ),
  )

export const rejectAuthorizationFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      rejectCreditAuthorization(
        actor,
        parseInput(authorizationIdInput, data).authorizationId,
      ),
    ),
  )
