import { useCallback, useEffect, useState } from 'react'

import { useActionRunner, messageOf } from '#/hooks/use-action-runner'
import { unwrap } from '#/lib/boundary'
import type { SaveCustomerInput } from '#/modules/customers/lib/customer-inputs'
import {
  customerOrdersFn,
  saveCustomerFn,
} from '#/modules/customers/server/customers'
import type { CustomerOrder } from '#/modules/customers/server/customer-orders'

/** Saves a customer and reloads the page; resolves to whether it worked. */
export function useSaveCustomer() {
  const run = useActionRunner()
  // A failed save refreshes too: the customer may exist already (see save-customer).
  return async (input: SaveCustomerInput) =>
    (await run(() => saveCustomerFn({ data: input }), 'Cliente guardado.')) !==
    undefined
}

export type OrdersState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; orders: Array<CustomerOrder> }

/** A customer's orders, fetched when their detail opens. */
export function useCustomerOrders(customerId: string) {
  const [state, setState] = useState<OrdersState>({ status: 'loading' })
  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const orders = unwrap(await customerOrdersFn({ data: { customerId } }))
      setState({ status: 'ready', orders })
    } catch (failure) {
      setState({ status: 'error', message: messageOf(failure) })
    }
  }, [customerId])
  useEffect(() => {
    void load()
  }, [load])
  return { state, reload: load }
}
