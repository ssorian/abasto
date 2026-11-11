import { unwrap } from '#/lib/boundary'
import { useActionRunner } from '#/hooks/use-action-runner'
import {
  cashEntryFn,
  cashHistoryFn,
  cashWithdrawalFn,
  closeCashFn,
  openCashFn,
} from '#/modules/cash/server/cash'

/** Write actions of the drawer; each reloads Mostrador and toasts the outcome. */
export function useCashActions(warehouseId: string) {
  const run = useActionRunner()
  return {
    open: (openingCents: number) =>
      run(
        () => openCashFn({ data: { warehouseId, openingCents } }),
        'Caja abierta.',
      ),
    close: (countedCents: number) =>
      run(
        () => closeCashFn({ data: { warehouseId, countedCents } }),
        'Caja cerrada.',
      ),
    entry: (amountCents: number, reason: string) =>
      run(
        () => cashEntryFn({ data: { warehouseId, amountCents, reason } }),
        'Entrada registrada.',
      ),
    withdrawal: (amountCents: number, reason: string) =>
      run(
        () => cashWithdrawalFn({ data: { warehouseId, amountCents, reason } }),
        'Retiro registrado.',
      ),
    history: async () => unwrap(await cashHistoryFn({ data: { warehouseId } })),
  }
}
