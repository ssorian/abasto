import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import {
  bulkChangePricesFn,
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
    success?: (data: T) => string,
  ): Promise<Outcome> {
    try {
      const data = unwrap(await action())
      await router.invalidate({ sync: true })
      if (success) toast.success(success(data))
      return { ok: true }
    } catch (failure) {
      return { ok: false, message: messageOf(failure) }
    }
  }

  return {
    /**
     * Resolves to the server message when it failed (shown inline by the dialog), or null.
     * Shows no toast: the dialog announces what it saved in one message.
     */
    savePrices: async (
      prices: Array<{ presentationId: string; priceCents: number }>,
    ): Promise<string | null> => {
      const result = await run(() =>
        setPricesFn({ data: { warehouseId: warehouseId ?? '', prices } }),
      )
      return result.ok ? null : result.message
    },
    bulkChange: (input: BulkChangeInput) =>
      run(
        () => bulkChangePricesFn({ data: input }),
        ({ changed }) => `Cambio masivo aplicado a ${changed} precios.`,
      ),
  }
}
