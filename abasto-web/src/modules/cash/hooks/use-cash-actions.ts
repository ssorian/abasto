import { unwrap } from '#/lib/boundary'
import { useActionRunner } from '#/hooks/use-action-runner'
import {
  cashEntryFn,
  cashHistoryFn,
  cashWithdrawalFn,
  closeCashFn,
  lastCloseFn,
  openCashFn,
} from '#/modules/cash/server/cash'
import type { CashSession } from '#/modules/cash/services/cash-ledger'

/**
 * Write actions of the drawer. Each refreshes Mostrador (the drawer totals)
 * before toasting the Spanish outcome, then runs `onSuccess` (close the
 * dialog). `pending` is true while one is saving.
 */
export function useCashActions(warehouseId: string) {
  const run = useActionRunner()
  return {
    pending: run.pending,
    open: (openingCents: number, onSuccess?: () => void) =>
      run(() => openCashFn({ data: { warehouseId, openingCents } }), {
        success: 'Caja abierta.',
        onSuccess,
      }),
    close: (
      countedCents: number,
      note: string,
      onSuccess?: (session: CashSession) => void,
    ) =>
      run(() => closeCashFn({ data: { warehouseId, countedCents, note } }), {
        success: 'Caja cerrada.',
        onSuccess,
      }),
    entry: (amountCents: number, reason: string, onSuccess?: () => void) =>
      run(() => cashEntryFn({ data: { warehouseId, amountCents, reason } }), {
        success: 'Entrada registrada.',
        onSuccess,
      }),
    withdrawal: (amountCents: number, reason: string, onSuccess?: () => void) =>
      run(
        () => cashWithdrawalFn({ data: { warehouseId, amountCents, reason } }),
        { success: 'Retiro registrado.', onSuccess },
      ),
    lastClose: async () => unwrap(await lastCloseFn({ data: { warehouseId } })),
    history: async () => unwrap(await cashHistoryFn({ data: { warehouseId } })),
  }
}
