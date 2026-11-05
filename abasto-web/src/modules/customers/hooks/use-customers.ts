import { useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { SaveCustomerInput } from '#/modules/customers/lib/customer-inputs'
import {
  customerOrdersFn,
  saveCustomerFn,
} from '#/modules/customers/server/customers'
import type { CustomerOrder } from '#/modules/customers/server/customer-orders'

const messageOf = (failure: unknown) =>
  failure instanceof ClientError ? failure.message : genericErrorMessage

/** Saves a customer and reloads the page; resolves to whether it worked. */
export function useSaveCustomer() {
  const router = useRouter()
  return async (input: SaveCustomerInput) => {
    try {
      unwrap(await saveCustomerFn({ data: input }))
      await router.invalidate()
      toast.success('Cliente guardado.')
      return true
    } catch (failure) {
      toast.error(messageOf(failure))
      // The customer may exist already (see save-customer): show it in the list.
      await router.invalidate()
      return false
    }
  }
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
