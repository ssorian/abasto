import { and, eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { businessDate } from '#/lib/utils/format'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import {
  netCostPerBoxCents,
  netCostPerPiece,
} from '#/modules/catalog/lib/supplier-cost'
import { purchaseLines, purchases } from '#/modules/inventory/db/schema'
import { loadBoxProducts } from '#/modules/inventory/services/box-products'
import { orderNotFound } from '#/modules/inventory/services/supplier-order-reads'
import {
  fitsInt4,
  isIsoDate,
  isWholeNumber,
  requireSupplier,
  requireWarehouse,
} from '#/modules/inventory/services/stock-ledger'

export {
  getSupplierOrder,
  listSupplierOrders,
} from '#/modules/inventory/services/supplier-order-reads'
export type {
  SupplierOrder,
  SupplierOrderLine,
  SupplierOrderSummary,
} from '#/modules/inventory/services/supplier-order-reads'
export { receiveSupplierOrder } from '#/modules/inventory/services/supplier-reception'

export type SupplierOrderInput = {
  supplierId: string
  warehouseId: string
  /** YYYY-MM-DD the supplier should deliver. */
  expectedOn?: string
  reference?: string
  lines: Array<{ productId: string; boxes: number }>
}

const tooBig = () => new AppError('invalid', 'El pedido es demasiado grande.')

function validate(input: SupplierOrderInput) {
  if (input.expectedOn && !isIsoDate(input.expectedOn)) {
    throw new AppError('invalid', 'La fecha esperada no es válida.')
  }
  if (!input.lines.length) {
    throw new AppError('invalid', 'Agrega al menos un producto al pedido.')
  }
  const seen = new Set<string>()
  for (const line of input.lines) {
    if (!isWholeNumber(line.boxes) || line.boxes <= 0) {
      throw new AppError(
        'invalid',
        'Las cajas deben ser un número entero mayor que cero.',
      )
    }
    if (seen.has(line.productId)) {
      throw new AppError(
        'invalid',
        'Cada producto solo puede aparecer una vez en el pedido.',
      )
    }
    seen.add(line.productId)
  }
}

/**
 * Queues an order with status Pedido: no lots, no movements. Cost per box
 * comes from the catalog's net supplier cost. A product whose supplier cost is
 * not set (list price 0) is accepted at cost 0 and reported in
 * `missingCostProductIds` so the caller can warn.
 */
export async function createSupplierOrder(
  actor: Actor,
  input: SupplierOrderInput,
): Promise<{ id: string; missingCostProductIds: Array<string> }> {
  authorize(actor, 'warehouse.manage', input.warehouseId)
  validate(input)
  return db.transaction(async (tx) => {
    await requireSupplier(tx, input.supplierId)
    await requireWarehouse(tx, input.warehouseId)
    const found = await loadBoxProducts(
      tx,
      input.lines.map((line) => line.productId),
    )
    const values = input.lines.map((line) => {
      const product = found.get(line.productId)
      if (!product) {
        throw new AppError('not_found', 'No encontramos ese producto.')
      }
      if (product.supplierId !== input.supplierId) {
        throw new AppError(
          'invalid',
          'Ese producto no pertenece a este proveedor.',
        )
      }
      const costPerBox = netCostPerBoxCents(
        Math.max(
          netCostPerPiece(
            product.listPricePerPiece,
            product.fixedDiscountPerPiece,
            product.promotionPerPiece,
          ),
          0,
        ),
        product.factor,
      )
      const quantity = line.boxes * product.factor
      const totalCostCents = costPerBox * line.boxes
      if (!fitsInt4(quantity) || !fitsInt4(totalCostCents)) throw tooBig()
      return {
        productId: line.productId,
        quantity,
        totalCostCents,
        boxFactor: product.factor,
        costMissing: product.listPricePerPiece === 0,
      }
    })
    const [purchase] = await tx
      .insert(purchases)
      .values({
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        reference: input.reference?.trim() ?? '',
        purchasedOn: businessDate(),
        expectedOn: input.expectedOn || null,
        status: 'Pedido',
        createdBy: actor.userId,
      })
      .returning({ id: purchases.id })
    await tx.insert(purchaseLines).values(
      values.map(({ costMissing: _costMissing, ...line }) => ({
        ...line,
        purchaseId: purchase.id,
      })),
    )
    return {
      id: purchase.id,
      missingCostProductIds: values
        .filter((line) => line.costMissing)
        .map((line) => line.productId),
    }
  })
}

/** Cancels an order that is still waiting; stock was never touched. */
export async function cancelSupplierOrder(actor: Actor, purchaseId: string) {
  await db.transaction(async (tx) => {
    const order = (
      await tx
        .select({ warehouseId: purchases.warehouseId })
        .from(purchases)
        .where(eq(purchases.id, purchaseId))
        .for('update')
    ).at(0)
    if (!order) throw orderNotFound()
    authorize(actor, 'warehouse.manage', order.warehouseId)
    const cancelled = await tx
      .update(purchases)
      .set({ status: 'Cancelado' })
      .where(and(eq(purchases.id, purchaseId), eq(purchases.status, 'Pedido')))
      .returning({ id: purchases.id })
    if (!cancelled.length) {
      throw new AppError(
        'conflict',
        'Solo se puede cancelar un pedido pendiente de recibir.',
      )
    }
  })
}
