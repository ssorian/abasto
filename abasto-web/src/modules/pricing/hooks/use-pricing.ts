import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import {
  bulkChangePricesFn,
  setMarginFn,
  setPricesFn,
} from '#/modules/pricing/server/pricing'
import type { BulkChangeInput } from '#/modules/pricing/services/bulk-prices'

const messageOf = (failure: unknown) =>
  failure instanceof ClientError ? failure.message : genericErrorMessage

export type Outcome = { ok: true } | { ok: false; message: string }

/** Write actions of Precios; server messages are returned verbatim, never reworded. */
export function usePricingActions(warehouseId: string | null) {
  const router = useRouter()

  async function run<T>(
    action: () => Promise<Result<T>>,
    success: (data: T) => string,
  ): Promise<Outcome> {
    try {
      const data = unwrap(await action())
      await router.invalidate()
      toast.success(success(data))
      return { ok: true }
    } catch (failure) {
      return { ok: false, message: messageOf(failure) }
    }
  }

  const withToast = async (outcome: Promise<Outcome>) => {
    const result = await outcome
    if (!result.ok) toast.error(result.message)
    return result.ok
  }

  return {
    savePrices: (
      prices: Array<{ presentationId: string; priceCents: number }>,
    ) =>
      withToast(
        run(
          () =>
            setPricesFn({ data: { warehouseId: warehouseId ?? '', prices } }),
          () =>
            prices.length === 1 ? 'Precio guardado.' : 'Precios guardados.',
        ),
      ),
    saveMargin: (productId: string, marginBps: number) =>
      withToast(
        run(
          () => setMarginFn({ data: { productId, marginBps } }),
          () => 'Margen guardado.',
        ),
      ),
    bulkChange: (input: BulkChangeInput) =>
      run(
        () => bulkChangePricesFn({ data: input }),
        ({ changed }) => `Cambio masivo aplicado a ${changed} precios.`,
      ),
  }
}
