import { useInlineAction } from '#/modules/catalog/hooks/use-inline-action'
import { setPricesFn } from '#/modules/pricing/server/pricing'

/** Write actions of Precios; server messages are returned verbatim, never reworded. */
export function usePricingActions(warehouseId: string | null) {
  const inline = useInlineAction()

  return {
    /**
     * Saves through the shared flow (lists refresh) and resolves to the server
     * message when it failed (shown inline by the dialog), or null.
     * Shows no toast: the dialog announces what it saved in one message.
     */
    savePrices: (
      prices: Array<{ presentationId: string; priceCents: number }>,
    ) =>
      inline(() =>
        setPricesFn({ data: { warehouseId: warehouseId ?? '', prices } }),
      ),
  }
}
