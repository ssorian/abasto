import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { can } from '#/modules/access/lib/policy'
import {
  customerOrdersInput,
  saveCustomerInput,
} from '#/modules/customers/lib/customer-inputs'
import { listCustomerOrders } from '#/modules/customers/server/customer-orders'
import { saveCustomer } from '#/modules/customers/server/save-customer'
import { listCommercialRules } from '#/modules/customers/services/commercial-rules'
import { listCustomers } from '#/modules/customers/services/customers'
import type {
  CustomerView,
  RuleView,
} from '#/modules/customers/lib/customer-view'

export type CustomersOverview = {
  /** Only the owner edits customers and their rules. */
  canManage: boolean
  customers: Array<CustomerView>
  rules: Record<string, Array<RuleView>>
}

/** Owner: every customer, inactive too. Staff: active customers only. */
export const customersOverviewFn = createServerFn({ method: 'GET' }).handler(
  () =>
    runWithActor(async (actor): Promise<CustomersOverview> => {
      const customers = await listCustomers(actor)
      const rules = await Promise.all(
        customers.map((customer) => listCommercialRules(actor, customer.id)),
      )
      return {
        canManage: can(actor, 'customers.manage'),
        customers,
        rules: Object.fromEntries(
          customers.map((customer, index) => [customer.id, rules[index]]),
        ),
      }
    }),
)

export const saveCustomerFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      saveCustomer(actor, parseInput(saveCustomerInput, data)),
    ),
  )

export const customerOrdersFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      listCustomerOrders(
        actor,
        parseInput(customerOrdersInput, data).customerId,
      ),
    ),
  )
