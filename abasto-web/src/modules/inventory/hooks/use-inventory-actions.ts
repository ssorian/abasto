import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import {
  adjustLotFn,
  applyPricesFn,
  countStockFn,
  createPurchaseFn,
  registerLossFn,
  setMinimumFn,
  suggestPricesFn,
} from '#/modules/inventory/server/inventory'
import type { PurchaseInput } from '#/modules/inventory/services/purchases'
import type { LossCategory } from '#/modules/inventory/db/schema'

const messageOf = (failure: unknown) =>
  failure instanceof ClientError ? failure.message : genericErrorMessage

/**
 * Write actions of Inventario. Each resolves to `{ data }` on success (the page
 * reloads), or to `undefined` after showing the server message as a toast.
 */
export function useInventoryActions() {
  const router = useRouter()

  async function run<T>(
    action: () => Promise<Result<T>>,
    success?: (data: T) => string,
  ): Promise<{ data: T } | undefined> {
    try {
      const data = unwrap(await action())
      await router.invalidate()
      if (success) toast.success(success(data))
      return { data }
    } catch (failure) {
      toast.error(messageOf(failure))
      return undefined
    }
  }

  return {
    createPurchase: (input: PurchaseInput) =>
      run(() => createPurchaseFn({ data: input })),
    /** Suggestions are optional: a failure here must not hide the saved purchase. */
    async loadSuggestions(purchaseId: string) {
      try {
        return unwrap(await suggestPricesFn({ data: { purchaseId } }))
      } catch (failure) {
        toast.error(messageOf(failure))
        return []
      }
    },
    applyPrices: (
      purchaseId: string,
      prices: Array<{ presentationId: string; priceCents: number }>,
    ) =>
      run(
        () => applyPricesFn({ data: { purchaseId, prices } }),
        () => 'Precios actualizados.',
      ),
    setMinimum: (input: {
      productId: string
      warehouseId: string
      minimum: number
    }) =>
      run(
        () => setMinimumFn({ data: input }),
        () => 'Mínimo guardado.',
      ),
    adjustLot: (input: { lotId: string; quantity: number; reason: string }) =>
      run(
        () => adjustLotFn({ data: input }),
        () => 'Ajuste registrado.',
      ),
    registerLoss: (input: {
      lotId: string
      quantity: number
      category: LossCategory
      reason: string
    }) =>
      run(
        () => registerLossFn({ data: input }),
        () => 'Pérdida registrada.',
      ),
    countStock: (input: {
      productId: string
      warehouseId: string
      countedQuantity: number
      note?: string
    }) => run(() => countStockFn({ data: input })),
  }
}
