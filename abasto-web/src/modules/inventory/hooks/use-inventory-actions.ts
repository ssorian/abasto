import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import {
  adjustLotFn,
  countStockFn,
  purchaseStandardPricesFn,
  registerLossFn,
  setMinimumFn,
} from '#/modules/inventory/server/inventory'
import {
  cancelSupplierOrderFn,
  createSupplierOrderFn,
  receiveSupplierOrderFn,
  supplierOrderFn,
  writeOffPendingsFn,
} from '#/modules/inventory/server/supplier-orders'
import { formatCents } from '#/modules/inventory/lib/cents'
import type { ReceptionInput } from '#/modules/inventory/services/supplier-reception'
import type {
  SupplierOrder,
  SupplierOrderInput,
} from '#/modules/inventory/services/supplier-orders'
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
    createOrder: (input: SupplierOrderInput) =>
      run(
        () => createSupplierOrderFn({ data: input }),
        () => 'Pedido registrado. Quedó en «Por recibir».',
      ),
    cancelOrder: (purchaseId: string) =>
      run(
        () => cancelSupplierOrderFn({ data: { purchaseId } }),
        () => 'Pedido cancelado.',
      ),
    receiveOrder: (input: ReceptionInput) =>
      run(
        () => receiveSupplierOrderFn({ data: input }),
        () => 'Pedido recibido. Las existencias ya están actualizadas.',
      ),
    writeOff: (input: {
      supplierId: string
      productId: string
      boxes: number
    }) =>
      run(
        () => writeOffPendingsFn({ data: input }),
        ({ valueCents }) =>
          `Se descontaron ${formatCents(valueCents)} del pago al proveedor.`,
      ),
    /** Lines of an order; a failure shows the message and resolves to undefined. */
    async loadOrder(purchaseId: string): Promise<SupplierOrder | undefined> {
      try {
        return unwrap(await supplierOrderFn({ data: { purchaseId } }))
      } catch (failure) {
        toast.error(messageOf(failure))
        return undefined
      }
    },
    /** Standard prices are shown read-only: a failure must not block the order. */
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
