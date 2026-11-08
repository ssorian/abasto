import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import {
  adjustLotFn,
  countStockFn,
  createPurchaseFn,
  purchaseStandardPricesFn,
  registerLossFn,
  setMinimumFn,
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
    /** Standard prices only prefill the form: a failure must not block the purchase. */
    async loadStandardPrices(
      warehouseId: string,
    ): Promise<Record<string, number>> {
      try {
        const prices = unwrap(
          await purchaseStandardPricesFn({ data: { warehouseId } }),
        )
        return Object.fromEntries(
          prices.map((price) => [price.productId, price.priceCents]),
        )
      } catch (failure) {
        toast.error(messageOf(failure))
        return {}
      }
    },
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
