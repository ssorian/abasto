import { and, eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { presentations, products } from '#/modules/catalog/db/schema'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'
import { lots, purchaseLines, purchases } from '#/modules/inventory/db/schema'
import {
  appendMovement,
  assertFitsInt4,
  isIsoDate,
  isWholeNumber,
  MAX_INT4,
  requireSupplier,
  requireWarehouse,
} from '#/modules/inventory/services/stock-ledger'
import type { Lot } from '#/modules/inventory/services/stock-ledger'

export type PurchaseLineInput = {
  productId: string
  /** Base units. */
  quantity: number
  /** Whole line cost in integer cents. */
  totalCostCents: number
  /**
   * Sale price per default presentation (box) in integer cents; never below
   * the cost per box. Omitted sells the lot at the standard price.
   */
  salePriceCents?: number
  lotCode?: string
  /** YYYY-MM-DD */
  expiresOn?: string
}
export type PurchaseInput = {
  supplierId: string
  warehouseId: string
  reference?: string
  /** YYYY-MM-DD */
  purchasedOn: string
  lines: Array<PurchaseLineInput>
}

function validate(input: PurchaseInput) {
  if (!isIsoDate(input.purchasedOn)) {
    throw new AppError('invalid', 'La fecha de la compra no es válida.')
  }
  if (!input.lines.length) {
    throw new AppError('invalid', 'Agrega al menos un producto a la compra.')
  }
  for (const line of input.lines) {
    if (!isWholeNumber(line.quantity) || line.quantity <= 0) {
      throw new AppError('invalid', 'La cantidad debe ser mayor que cero.')
    }
    assertFitsInt4(
      line.quantity,
      `La cantidad no puede ser mayor que ${MAX_INT4}.`,
    )
    if (!isWholeNumber(line.totalCostCents) || line.totalCostCents < 0) {
      throw new AppError(
        'invalid',
        'El costo debe ser un monto en centavos de cero o más.',
      )
    }
    assertFitsInt4(
      line.totalCostCents,
      `El costo no puede ser mayor que ${MAX_INT4} centavos.`,
    )
    if (
      line.salePriceCents !== undefined &&
      (!isWholeNumber(line.salePriceCents) || line.salePriceCents <= 0)
    ) {
      throw new AppError(
        'invalid',
        'El precio de salida debe ser un monto en centavos mayor que cero.',
      )
    }
    if (line.salePriceCents !== undefined) {
      assertFitsInt4(
        line.salePriceCents,
        `El precio de salida no puede ser mayor que ${MAX_INT4} centavos.`,
      )
    }
    if (line.expiresOn && !isIsoDate(line.expiresOn)) {
      throw new AppError('invalid', 'La fecha de caducidad no es válida.')
    }
  }
}

/** Records a purchase and creates one lot (plus its ledger entry) per line, atomically. */
export async function createPurchase(
  actor: Actor,
  input: PurchaseInput,
): Promise<{ id: string; lots: Array<Lot> }> {
  authorize(actor, 'warehouse.manage', input.warehouseId)
  validate(input)
  return db.transaction(async (tx) => {
    await requireSupplier(tx, input.supplierId)
    await requireWarehouse(tx, input.warehouseId)
    await expireOverdueOrders(tx, input.warehouseId)
    const productIds = [...new Set(input.lines.map((line) => line.productId))]
    const found = await tx
      .select({ id: products.id, boxFactor: presentations.factor })
      .from(products)
      .leftJoin(
        presentations,
        and(
          eq(presentations.productId, products.id),
          eq(presentations.isDefault, true),
        ),
      )
      .where(inArray(products.id, productIds))
    if (found.length !== productIds.length) {
      throw new AppError('not_found', 'No encontramos ese producto.')
    }
    const boxFactor = new Map(found.map((row) => [row.id, row.boxFactor ?? 1]))
    for (const line of input.lines) {
      if (line.salePriceCents === undefined) continue
      // price ≥ totalCost / boxes, with boxes = quantity / factor; compared without rounding.
      const factor = BigInt(boxFactor.get(line.productId) ?? 1)
      if (
        BigInt(line.salePriceCents) * BigInt(line.quantity) <
        BigInt(line.totalCostCents) * factor
      ) {
        throw new AppError(
          'invalid',
          'El precio de salida no puede ser menor que el costo por caja.',
        )
      }
    }
    const [purchase] = await tx
      .insert(purchases)
      .values({
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        reference: input.reference?.trim() ?? '',
        purchasedOn: input.purchasedOn,
        createdBy: actor.userId,
      })
      .returning({ id: purchases.id })
    const created: Array<Lot> = []
    for (const line of input.lines) {
      const [stored] = await tx
        .insert(purchaseLines)
        .values({
          purchaseId: purchase.id,
          productId: line.productId,
          quantity: line.quantity,
          totalCostCents: line.totalCostCents,
          lotCode: line.lotCode?.trim() ?? '',
          expiresOn: line.expiresOn || null,
        })
        .returning()
      // The lot starts empty; the purchase movement brings it to `quantity`.
      const [lot] = await tx
        .insert(lots)
        .values({
          productId: line.productId,
          warehouseId: input.warehouseId,
          purchaseLineId: stored.id,
          code: stored.lotCode,
          expiresOn: stored.expiresOn,
          receivedQuantity: line.quantity,
          receivedCostCents: line.totalCostCents,
          salePriceCents: line.salePriceCents ?? null,
          onHand: 0,
        })
        .returning()
      await appendMovement(tx, lot, {
        type: 'purchase',
        quantity: line.quantity,
        reason: 'Compra',
        reference: purchase.id,
        actorId: actor.userId,
      })
      created.push({ ...lot, onHand: line.quantity })
    }
    return { id: purchase.id, lots: created }
  })
}
