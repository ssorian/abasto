import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import {
  grantStoreAccessInput,
  storeAccessInput,
  storeAccessPasswordInput,
} from '#/modules/store/lib/store-access-inputs'
import {
  getStoreAccess,
  grantStoreAccess,
  setStoreAccessPassword,
} from '#/modules/store/services/store-access'

/** Owner: the customer's store sign-in email, or null. */
export const storeAccessFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getStoreAccess(actor, parseInput(storeAccessInput, data).customerId),
    ),
  )

export const grantStoreAccessFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      grantStoreAccess(actor, parseInput(grantStoreAccessInput, data)),
    ),
  )

export const storeAccessPasswordFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      setStoreAccessPassword(actor, parseInput(storeAccessPasswordInput, data)),
    ),
  )
