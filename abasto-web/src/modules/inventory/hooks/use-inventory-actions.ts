import { toast } from 'sonner'

import { messageOf, useActionRunner } from '#/hooks/use-action-runner'
import { unwrap } from '#/lib/boundary'
import {
  adjustLotFn,
  countStockFn,
  purchaseStandardPricesFn,
  registerLossFn,
  setMinimumFn,
  warehouseStockFn,
} from '#/modules/inventory/server/inventory'
import {
  cancelSupplierOrderFn,
  createSupplierOrderFn,
  receiveSupplierOrderFn,
  returnPendingsFn,
  scrapPendingsFn,
  supplierOrderFn,
} from '#/modules/inventory/server/supplier-orders'
import type { OrderStock } from '#/modules/inventory/lib/order-rows'
import { formatCents } from '#/modules/inventory/lib/cents'
import type {
  ReturnRequest,
  ScrapRequest,
} from '#/modules/inventory/lib/pending-return'
import type { ReceptionInput } from '#/modules/inventory/services/supplier-reception'
import type {
  SupplierOrder,
  SupplierOrderInput,
} from '#/modules/inventory/services/supplier-orders'
import type { LossCategory } from '#/modules/inventory/db/schema'

/**
 * Write actions of Inventario, on the shared runner: each resolves to `{ data }`
 * after refreshing the lists and toasting the Spanish success message, or to
 * `undefined` after toasting the server message. `pending` is true while one runs.
 */
export function useInventoryActions() {
  const run = useActionRunner()

  return {
    pending: run.pending,
    createOrder: (input: SupplierOrderInput) =>
      run(
        () => createSupplierOrderFn({ data: input }),
        'Pedido registrado. Quedó en «Por recibir».',
      ),
    cancelOrder: (purchaseId: string) =>
      run(
        () => cancelSupplierOrderFn({ data: { purchaseId } }),
        'Pedido cancelado.',
      ),
    receiveOrder: (input: ReceptionInput, success: string) =>
      run(() => receiveSupplierOrderFn({ data: input }), success),
    returnPending: (input: ReturnRequest) =>
      run(() => returnPendingsFn({ data: input }), {
        onSuccess: ({ creditCents }) =>
          toast.success(
            creditCents === null
              ? 'Devolución registrada: el proveedor repondrá las cajas.'
              : creditCents === 0
                ? 'Devolución registrada sin descuento.'
                : `Devolución registrada: ${formatCents(creditCents)} a favor para el siguiente pedido.`,
          ),
      }),
    scrapPending: (input: ScrapRequest) =>
      run(() => scrapPendingsFn({ data: input }), {
        onSuccess: ({ valueCents }) =>
          toast.success(
            `Merma registrada: se perdieron ${formatCents(valueCents)}.`,
          ),
      }),
    /** Lines of an order; a failure shows the message and resolves to undefined. */
    async loadOrder(purchaseId: string): Promise<SupplierOrder | undefined> {
      try {
        return unwrap(await supplierOrderFn({ data: { purchaseId } }))
      } catch (failure) {
        toast.error(messageOf(failure))
        return undefined
      }
    },
    /**
     * Standard prices are shown read-only: a failure must not block the order.
     * It resolves to undefined so the rows stay quiet instead of claiming there is no price.
     */
    async loadStandardPrices(
      warehouseId: string,
    ): Promise<Record<string, number> | undefined> {
      try {
        const prices = unwrap(
          await purchaseStandardPricesFn({ data: { warehouseId } }),
        )
        return Object.fromEntries(
          prices.map((price) => [price.productId, price.priceCents]),
        )
      } catch (failure) {
        toast.error(messageOf(failure))
        return undefined
      }
    },
    /** Sellable stock and minimum (pieces) by product in a warehouse; undefined on failure. */
    async loadWarehouseStock(
      warehouseId: string,
    ): Promise<Record<string, OrderStock> | undefined> {
      try {
        const stock = unwrap(await warehouseStockFn({ data: { warehouseId } }))
        return Object.fromEntries(
          stock.map(({ productId, available, minimum }) => [
            productId,
            { available, minimum },
          ]),
        )
      } catch (failure) {
        toast.error(messageOf(failure))
        return undefined
      }
    },
    setMinimum: (input: {
      productId: string
      warehouseId: string
      minimum: number
    }) => run(() => setMinimumFn({ data: input }), 'Mínimo guardado.'),
    /** "Quitar existencias" for expired or damaged units: a loss in the ledger. */
    registerLoss: (input: {
      lotId: string
      quantity: number
      category: LossCategory
      reason: string
    }) => run(() => registerLossFn({ data: input }), 'Existencias quitadas.'),
    /** "Quitar existencias" for another reason: a negative adjustment in the ledger. */
    adjustLot: (input: { lotId: string; quantity: number; reason: string }) =>
      run(() => adjustLotFn({ data: input }), 'Existencias quitadas.'),
    countStock: (input: {
      productId: string
      warehouseId: string
      countedQuantity: number
      note?: string
    }) => run(() => countStockFn({ data: input })),
  }
}
