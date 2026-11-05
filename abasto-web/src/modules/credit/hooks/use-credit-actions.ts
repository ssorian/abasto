import { unwrap } from '#/lib/boundary'
import { useActionRunner } from '#/modules/cash/hooks/use-action-runner'
import {
  approveAuthorizationFn,
  customerBalanceFn,
  customerStatementFn,
  recordAbonoFn,
  rejectAuthorizationFn,
} from '#/modules/credit/server/credit'

/** Cobros writes (each reloads the page) and the on-demand reads of a customer. */
export function useCreditActions() {
  const run = useActionRunner()
  return {
    approve: (authorizationId: string) =>
      run(
        () => approveAuthorizationFn({ data: { authorizationId } }),
        'Crédito autorizado. Ya se puede entregar el pedido.',
      ),
    reject: (authorizationId: string) =>
      run(
        () => rejectAuthorizationFn({ data: { authorizationId } }),
        'Crédito rechazado.',
      ),
    abono: (warehouseId: string, customerId: string, amountCents: number) =>
      run(
        () => recordAbonoFn({ data: { warehouseId, customerId, amountCents } }),
        'Abono registrado.',
      ),
    statement: async (customerId: string) =>
      unwrap(await customerStatementFn({ data: { customerId } })),
    balance: async (customerId: string) =>
      unwrap(await customerBalanceFn({ data: { customerId } })),
  }
}
