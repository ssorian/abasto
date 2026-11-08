import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'
import {
  purchaseLines,
  purchases,
  supplierPendings,
} from '#/modules/inventory/db/schema'
import type { PendingType } from '#/modules/inventory/db/schema'
import { lineShareCents } from '#/modules/inventory/lib/pending-value'
import { loadBoxProducts } from '#/modules/inventory/services/box-products'
import {
  lotSalePrice,
  receiveLot,
  standardBoxPrices,
} from '#/modules/inventory/services/reception-lots'
import { orderNotFound } from '#/modules/inventory/services/supplier-order-reads'
import {
  lockSupplier,
  settleOwed,
} from '#/modules/inventory/services/supplier-balance'
import { isIsoDate } from '#/modules/inventory/services/stock-ledger'
import type { Lot } from '#/modules/inventory/services/stock-ledger'

export type ReceptionLineInput = {
  lineId: string
  goodBoxes: number
  damagedBoxes: number
  lotCode?: string
  /** YYYY-MM-DD */
  expiresOn?: string
}
export type ReceptionInput = {
  purchaseId: string
  lines: Array<ReceptionLineInput>
  /** Boxes the supplier sends to settle earlier pendings of the same supplier. */
  replacements?: Array<{
    productId: string
    boxes: number
    lotCode?: string
    expiresOn?: string
  }>
}

const isCount = (value: number) => Number.isSafeInteger(value) && value >= 0

function validateLines(
  stored: Array<{ id: string; quantity: number; boxFactor: number }>,
  input: ReceptionInput,
) {
  const ids = new Set(input.lines.map((line) => line.lineId))
  if (
    ids.size !== input.lines.length ||
    ids.size !== stored.length ||
    !stored.every((line) => ids.has(line.id))
  ) {
    throw new AppError(
      'invalid',
      'Captura la recepción de todas las líneas del pedido.',
    )
  }
  const ordered = new Map(
    stored.map((line) => [line.id, line.quantity / line.boxFactor]),
  )
  for (const line of input.lines) {
    if (!isCount(line.goodBoxes) || !isCount(line.damagedBoxes)) {
      throw new AppError(
        'invalid',
        'Las cajas recibidas deben ser enteros de cero o más.',
      )
    }
    if (line.goodBoxes + line.damagedBoxes > ordered.get(line.lineId)!) {
      throw new AppError(
        'invalid',
        'Las cajas buenas y dañadas no pueden superar las cajas pedidas.',
      )
    }
    if (line.expiresOn && !isIsoDate(line.expiresOn)) {
      throw new AppError('invalid', 'La fecha de caducidad no es válida.')
    }
  }
}

function validateReplacements(input: ReceptionInput) {
  const seen = new Set<string>()
  for (const item of input.replacements ?? []) {
    if (!Number.isSafeInteger(item.boxes) || item.boxes <= 0) {
      throw new AppError(
        'invalid',
        'Las cajas de reposición deben ser un número entero mayor que cero.',
      )
    }
    if (seen.has(item.productId)) {
      throw new AppError(
        'invalid',
        'Cada producto solo puede aparecer una vez en la reposición.',
      )
    }
    if (item.expiresOn && !isIsoDate(item.expiresOn)) {
      throw new AppError('invalid', 'La fecha de caducidad no es válida.')
    }
    seen.add(item.productId)
  }
}

/**
 * Verifies a waiting order: one lot per line with good boxes, damaged and
 * missing boxes become supplier pendings, replacements settle earlier
 * pendings at their original cost. Stock changes only here, atomically; the
 * purchase row is locked so an order cannot be received twice.
 */
export async function receiveSupplierOrder(
  actor: Actor,
  input: ReceptionInput,
): Promise<{ id: string; lots: Array<Lot>; replacementLots: Array<Lot> }> {
  return db.transaction(async (tx) => {
    const order = (
      await tx
        .select()
        .from(purchases)
        .where(eq(purchases.id, input.purchaseId))
        .for('update')
    ).at(0)
    if (!order) throw orderNotFound()
    authorize(actor, 'warehouse.manage', order.warehouseId)
    if (order.status !== 'Pedido') {
      throw new AppError(
        'conflict',
        'Ese pedido ya no está pendiente de recibir.',
      )
    }
    const stored = await tx
      .select()
      .from(purchaseLines)
      .where(eq(purchaseLines.purchaseId, order.id))
    validateLines(stored, input)
    validateReplacements(input)
    await expireOverdueOrders(tx, order.warehouseId)

    const replacements = input.replacements ?? []
    const boxProducts = await loadBoxProducts(tx, [
      ...stored.map((line) => line.productId),
      ...replacements.map((item) => item.productId),
    ])
    const prices = await standardBoxPrices(
      tx,
      order.warehouseId,
      boxProducts.values(),
    )
    // Replacements first: they settle pendings from earlier orders only.
    const replacementLots: Array<Lot> = []
    if (replacements.length) await lockSupplier(tx, order.supplierId)
    for (const item of replacements) {
      const factor = boxProducts.get(item.productId)?.factor ?? 1
      const units = item.boxes * factor
      const costCents = await settleOwed(
        tx,
        {
          supplierId: order.supplierId,
          productId: item.productId,
          purchaseId: order.id,
          type: 'replaced',
          units,
          actorId: actor.userId,
        },
        () =>
          new AppError(
            'invalid',
            'Las cajas de reposición superan el saldo del proveedor.',
          ),
      )
      replacementLots.push(
        await receiveLot(tx, {
          productId: item.productId,
          warehouseId: order.warehouseId,
          purchaseLineId: null,
          purchaseId: order.id,
          code: item.lotCode?.trim() ?? '',
          expiresOn: item.expiresOn || null,
          units,
          costCents,
          salePriceCents: lotSalePrice(
            prices.get(item.productId),
            costCents,
            units,
            factor,
          ),
          reason: 'Reposición del proveedor',
          actorId: actor.userId,
        }),
      )
    }

    const lots: Array<Lot> = []
    const owed: Array<{
      productId: string
      type: PendingType
      quantity: number
      valueCents: number
    }> = []
    for (const entry of input.lines) {
      const line = stored.find((item) => item.id === entry.lineId)!
      const goodUnits = entry.goodBoxes * line.boxFactor
      const damagedUnits = entry.damagedBoxes * line.boxFactor
      const missingUnits = line.quantity - goodUnits - damagedUnits
      const code = entry.lotCode?.trim() ?? ''
      const expiresOn = entry.expiresOn || null
      await tx
        .update(purchaseLines)
        .set({
          goodQuantity: goodUnits,
          damagedQuantity: damagedUnits,
          lotCode: code,
          expiresOn,
        })
        .where(eq(purchaseLines.id, line.id))
      if (goodUnits > 0) {
        const costCents = lineShareCents(
          line.totalCostCents,
          goodUnits,
          line.quantity,
        )
        lots.push(
          await receiveLot(tx, {
            productId: line.productId,
            warehouseId: order.warehouseId,
            purchaseLineId: line.id,
            purchaseId: order.id,
            code,
            expiresOn,
            units: goodUnits,
            costCents,
            salePriceCents: lotSalePrice(
              prices.get(line.productId),
              costCents,
              goodUnits,
              line.boxFactor,
            ),
            reason: 'Compra',
            actorId: actor.userId,
          }),
        )
      }
      for (const [type, units] of [
        ['damaged', damagedUnits],
        ['missing', missingUnits],
      ] as const) {
        if (units > 0) {
          owed.push({
            productId: line.productId,
            type,
            quantity: units,
            valueCents: lineShareCents(
              line.totalCostCents,
              units,
              line.quantity,
            ),
          })
        }
      }
    }
    if (owed.length) {
      await tx.insert(supplierPendings).values(
        owed.map((row) => ({
          ...row,
          supplierId: order.supplierId,
          purchaseId: order.id,
          actorId: actor.userId,
        })),
      )
    }
    await tx
      .update(purchases)
      .set({
        status: 'Recibido',
        receivedAt: new Date(),
        receivedBy: actor.userId,
      })
      .where(eq(purchases.id, order.id))
    return { id: order.id, lots, replacementLots }
  })
}
