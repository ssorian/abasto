import { and, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import type { Tx } from '#/modules/inventory/services/stock-ledger'
import { AppError } from '#/lib/errors'
import { businessDate } from '#/lib/utils/format'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { grossLineCents, netLineCents } from '#/lib/utils/supplier-cost'
import { purchaseLines, purchases } from '#/modules/inventory/db/schema'
import { supplierFolio } from '#/modules/inventory/lib/order-code'
import { openOf } from '#/modules/inventory/lib/pending-value'
import { productArchived } from '#/modules/catalog/services/product-reads'
import { loadBoxProducts } from '#/modules/inventory/services/box-products'
import {
  discountBalance,
  loadSupplierBalances,
  lockSupplier,
  reopenDiscounts,
} from '#/modules/inventory/services/supplier-balance'
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
  /** Boxes only: price, discount and promotion come from the catalog product. */
  lines: Array<{ productId: string; boxes: number }>
  /**
   * Open "Por reponer" balances of this supplier closed "a lo chino" by this
   * order: their remaining value is no longer paid and is stored on the order.
   */
  discounts?: Array<{ pendingId: string }>
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
  const discounted = new Set<string>()
  for (const discount of input.discounts ?? []) {
    if (discounted.has(discount.pendingId)) {
      throw new AppError(
        'invalid',
        'Cada saldo solo se puede descontar una vez en el pedido.',
      )
    }
    discounted.add(discount.pendingId)
  }
}

/**
 * Queues an order with status Pedido: no lots, no movements. A line is only
 * boxes: the product's list price, fixed discount and promotion per piece are
 * copied into it, so later catalog changes never alter the order. The gross
 * cost is pieces × list price and the lot cost the net line cost: gross −
 * pieces × (discount + promotion), each rounded half up to cents once.
 */
/**
 * Next automatic folio (E001, E002…): one past the highest `E<number>`
 * reference stored. The transaction lock keeps two orders from taking the same one.
 */
async function nextSupplierFolio(tx: Tx): Promise<string> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext('purchases.supplier_folio'))`,
  )
  const result = await tx.execute<{ last: number | null }>(
    sql`select max(substring(${purchases.reference} from '^E([0-9]+)$')::int) as last from ${purchases}`,
  )
  return supplierFolio(Number(result.rows[0]?.last ?? 0) + 1)
}

export async function createSupplierOrder(
  actor: Actor,
  input: SupplierOrderInput,
): Promise<{ id: string; discountCents: number }> {
  authorize(actor, 'warehouse.manage', input.warehouseId)
  validate(input)
  const discounts = input.discounts ?? []
  return db.transaction(async (tx) => {
    await requireSupplier(tx, input.supplierId)
    await requireWarehouse(tx, input.warehouseId)
    // Locked before reading the balances so two orders cannot discount one twice.
    if (discounts.length) await lockSupplier(tx, input.supplierId)
    const balances = await loadSupplierBalances(
      tx,
      input.supplierId,
      discounts.map((item) => item.pendingId),
    )
    for (const balance of balances) {
      if (balance.kind === 'return') {
        throw new AppError(
          'invalid',
          'Solo se pueden descontar faltantes por reponer o descuentos a favor.',
        )
      }
      if (openOf(balance).units === 0) {
        throw new AppError('invalid', 'Ese saldo ya está cerrado.')
      }
    }
    const discountCents = balances.reduce(
      (sum, balance) => sum + balance.valueCents - balance.settledValueCents,
      0,
    )
    const found = await loadBoxProducts(
      tx,
      input.lines.map((line) => line.productId),
    )
    const values = input.lines.map((line) => {
      const product = found.get(line.productId)
      if (!product) {
        throw new AppError('not_found', 'No encontramos ese producto.')
      }
      if (product.archivedAt) throw productArchived()
      if (product.supplierId !== input.supplierId) {
        throw new AppError(
          'invalid',
          'Ese producto no pertenece a este proveedor.',
        )
      }
      const quantity = line.boxes * product.factor
      if (!fitsInt4(quantity)) throw tooBig()
      const grossCostCents = grossLineCents(quantity, product.listPricePerPiece)
      if (!fitsInt4(grossCostCents)) throw tooBig()
      const totalCostCents = netLineCents(
        grossCostCents,
        quantity,
        product.fixedDiscountPerPiece,
        product.promotionPerPiece,
      )
      if (totalCostCents < 0) {
        throw new AppError(
          'invalid',
          'El descuento y la promoción no pueden superar el costo por pieza.',
        )
      }
      return {
        productId: line.productId,
        quantity,
        totalCostCents,
        boxFactor: product.factor,
        listPricePerPiece: product.listPricePerPiece,
        orderedListPricePerPiece: product.listPricePerPiece,
        grossCostCents,
        fixedDiscountPerPiece: product.fixedDiscountPerPiece,
        promotionPerPiece: product.promotionPerPiece,
      }
    })
    const netCents = values.reduce((sum, line) => sum + line.totalCostCents, 0)
    if (discountCents > netCents) {
      throw new AppError(
        'invalid',
        'Los descuentos no pueden superar el total del pedido.',
      )
    }
    const [purchase] = await tx
      .insert(purchases)
      .values({
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        reference: await nextSupplierFolio(tx),
        purchasedOn: businessDate(),
        expectedOn: input.expectedOn || null,
        status: 'Pedido',
        createdBy: actor.userId,
        discountCents,
      })
      .returning({ id: purchases.id })
    await tx
      .insert(purchaseLines)
      .values(values.map((line) => ({ ...line, purchaseId: purchase.id })))
    for (const balance of balances) {
      await discountBalance(tx, balance, purchase.id, actor.userId)
    }
    return { id: purchase.id, discountCents }
  })
}

/**
 * Cancels an order that is still waiting; stock was never touched. The
 * balances it discounted are reopened and its discount goes back to zero.
 */
export async function cancelSupplierOrder(actor: Actor, purchaseId: string) {
  await db.transaction(async (tx) => {
    const order = (
      await tx
        .select({
          warehouseId: purchases.warehouseId,
          supplierId: purchases.supplierId,
          discountCents: purchases.discountCents,
        })
        .from(purchases)
        .where(eq(purchases.id, purchaseId))
        .for('update')
    ).at(0)
    if (!order) throw orderNotFound()
    authorize(actor, 'warehouse.manage', order.warehouseId)
    const cancelled = await tx
      .update(purchases)
      .set({ status: 'Cancelado', discountCents: 0 })
      .where(and(eq(purchases.id, purchaseId), eq(purchases.status, 'Pedido')))
      .returning({ id: purchases.id })
    if (!cancelled.length) {
      throw new AppError(
        'conflict',
        'Solo se puede cancelar un pedido pendiente de recibir.',
      )
    }
    // Discounted balances can be worth zero, so reopen by the ledger entries,
    // not by the stored amount.
    await lockSupplier(tx, order.supplierId)
    await reopenDiscounts(tx, purchaseId, actor.userId)
  })
}
