import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { businessDate } from '#/modules/orders/services/clock'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'
import {
  purchaseLines,
  purchases,
  supplierPendings,
} from '#/modules/inventory/db/schema'
import { orderCode } from '#/modules/inventory/lib/order-code'
import { lineShareCents } from '#/modules/inventory/lib/pending-value'
import { loadBoxProducts } from '#/modules/inventory/services/box-products'
import {
  applyReceivedPrices,
  saveCatalogPrices,
} from '#/modules/inventory/services/reception-prices'
import {
  lotSalePrice,
  receiveLot,
  standardBoxPrices,
} from '#/modules/inventory/services/reception-lots'
import { orderNotFound } from '#/modules/inventory/services/supplier-order-reads'
import {
  loadSupplierBalances,
  lockSupplier,
  settleBalance,
} from '#/modules/inventory/services/supplier-balance'
import type { Balance } from '#/modules/inventory/services/supplier-balance'
import { isIsoDate } from '#/modules/inventory/services/stock-ledger'
import type { Lot } from '#/modules/inventory/services/stock-ledger'

export type ReceptionLineInput = {
  lineId: string
  /** Whole boxes that never arrived: they become a "Por reponer" balance. */
  missingBoxes: number
  /** Whole boxes that arrived damaged or expired: a "Por devolver" balance, never stock. */
  damagedBoxes: number
  /** YYYY-MM-DD. Required when good boxes enter, unless `noExpiry` says the product has none. */
  expiresOn?: string
  /** Explicit statement that the good boxes carry no expiry date. */
  noExpiry?: boolean
  /**
   * List price per piece the supplier actually charged (ten-thousandths);
   * omitted or equal keeps the ordered one. The line's discount and promotion
   * still apply.
   */
  listPricePerPiece?: number
}
export type ReceptionInput = {
  purchaseId: string
  /** Good boxes are derived: ordered − missing − damaged. */
  lines: Array<ReceptionLineInput>
  /** Also save every changed list price per piece on its catalog product. */
  updateCatalogPrices?: boolean
  /** Open "Por reponer" balances of the same supplier (other orders) that arrived with this delivery. */
  replacements?: Array<{
    pendingId: string
    boxes: number
    expiresOn?: string
    noExpiry?: boolean
  }>
  /** Explicit acceptance of good boxes that enter already past their expiry date. */
  confirmExpired?: boolean
}

const missingExpiry = () =>
  new AppError(
    'invalid',
    'Indica la caducidad de cada producto que entra o marca «Sin caducidad».',
  )

const expiredNotConfirmed = () =>
  new AppError(
    'conflict',
    'Hay productos que entran con la caducidad vencida. Confirma la recepción para aceptarlos.',
  )

/** Stock that enters must say when it expires, or explicitly that it does not. */
const declaresExpiry = (item: { expiresOn?: string; noExpiry?: boolean }) =>
  Boolean(item.expiresOn) || item.noExpiry === true

const isCount = (value: number) => Number.isSafeInteger(value) && value >= 0

function validateLines(
  stored: Array<{ id: string; quantity: number; boxFactor: number }>,
  input: ReceptionInput,
  today: string,
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
    if (!isCount(line.missingBoxes) || !isCount(line.damagedBoxes)) {
      throw new AppError(
        'invalid',
        'Las cajas faltantes y dañadas deben ser enteros de cero o más.',
      )
    }
    if (line.missingBoxes + line.damagedBoxes > ordered.get(line.lineId)!) {
      throw new AppError(
        'invalid',
        'Las cajas faltantes y dañadas no pueden superar las cajas pedidas.',
      )
    }
    if (line.expiresOn && !isIsoDate(line.expiresOn)) {
      throw new AppError('invalid', 'La fecha de caducidad no es válida.')
    }
    const good =
      ordered.get(line.lineId)! - line.missingBoxes - line.damagedBoxes
    if (good > 0 && !declaresExpiry(line)) throw missingExpiry()
    if (good > 0 && isExpired(line, today) && !input.confirmExpired) {
      throw expiredNotConfirmed()
    }
  }
}

const isExpired = (item: { expiresOn?: string }, today: string) =>
  Boolean(item.expiresOn) && item.expiresOn! < today

function validateReplacements(input: ReceptionInput, today: string) {
  const seen = new Set<string>()
  for (const item of input.replacements ?? []) {
    if (!Number.isSafeInteger(item.boxes) || item.boxes <= 0) {
      throw new AppError(
        'invalid',
        'Las cajas de reposición deben ser un número entero mayor que cero.',
      )
    }
    if (seen.has(item.pendingId)) {
      throw new AppError(
        'invalid',
        'Cada saldo solo puede aparecer una vez en la reposición.',
      )
    }
    if (item.expiresOn && !isIsoDate(item.expiresOn)) {
      throw new AppError('invalid', 'La fecha de caducidad no es válida.')
    }
    if (!declaresExpiry(item)) throw missingExpiry()
    if (isExpired(item, today) && !input.confirmExpired) {
      throw expiredNotConfirmed()
    }
    seen.add(item.pendingId)
  }
}

/**
 * Verifies a waiting order from its exceptions only: per line the missing and
 * damaged boxes (the good ones are ordered − missing − damaged) and, when the
 * supplier charged another list price per piece, that price: the line's costs
 * are recomputed first, so lots and balances use what was actually charged. Every lot of
 * the order gets the order's code (its reference, else `PED-` + folio). Good
 * boxes become one lot per line; missing boxes become a "Por reponer" balance
 * and damaged ones a "Por devolver" balance, never stock. Replacements settle
 * open "Por reponer" balances of the same supplier (other orders) and enter as
 * lots at their original cost. Stock changes only here, atomically; the
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
    const ordered = await tx
      .select()
      .from(purchaseLines)
      .where(eq(purchaseLines.purchaseId, order.id))
    const today = businessDate()
    validateLines(ordered, input, today)
    validateReplacements(input, today)
    const repriced = await applyReceivedPrices(
      tx,
      ordered,
      new Map(
        input.lines.flatMap((line) =>
          line.listPricePerPiece === undefined
            ? []
            : [[line.lineId, line.listPricePerPiece] as const],
        ),
      ),
      order.discountCents,
    )
    const stored = repriced.lines
    await expireOverdueOrders(tx, order.warehouseId)

    const code = orderCode(order)
    const replacements = input.replacements ?? []
    // Replacements settle balances of earlier orders of this supplier only.
    let balances: Array<Balance> = []
    if (replacements.length) {
      await lockSupplier(tx, order.supplierId)
      balances = await loadSupplierBalances(
        tx,
        order.supplierId,
        replacements.map((item) => item.pendingId),
      )
      for (const balance of balances) {
        if (balance.kind !== 'restock') {
          throw new AppError(
            'invalid',
            'Ese saldo no es un faltante por reponer.',
          )
        }
      }
    }
    const boxProducts = await loadBoxProducts(tx, [
      ...stored.map((line) => line.productId),
      ...balances.map((balance) => balance.productId),
    ])
    if (input.updateCatalogPrices) {
      await saveCatalogPrices(tx, actor, repriced.changed, boxProducts)
    }
    const prices = await standardBoxPrices(
      tx,
      order.warehouseId,
      boxProducts.values(),
    )
    const replacementLots: Array<Lot> = []
    for (const [index, item] of replacements.entries()) {
      const balance = balances[index]
      const { valueCents: costCents, units } = await settleBalance(
        tx,
        {
          balance,
          boxes: item.boxes,
          type: 'replaced',
          purchaseId: order.id,
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
          productId: balance.productId,
          warehouseId: order.warehouseId,
          purchaseLineId: null,
          purchaseId: order.id,
          code,
          expiresOn: item.expiresOn || null,
          units,
          costCents,
          salePriceCents: lotSalePrice(
            prices.get(balance.productId),
            costCents,
            item.boxes,
          ),
          reason: 'Reposición del proveedor',
          actorId: actor.userId,
        }),
      )
    }

    const lots: Array<Lot> = []
    const owed: Array<{
      productId: string
      type: 'missing' | 'damaged'
      quantity: number
      valueCents: number
    }> = []
    for (const entry of input.lines) {
      const line = stored.find((item) => item.id === entry.lineId)!
      const missingUnits = entry.missingBoxes * line.boxFactor
      const damagedUnits = entry.damagedBoxes * line.boxFactor
      const goodUnits = line.quantity - missingUnits - damagedUnits
      const goodBoxes = goodUnits / line.boxFactor
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
              goodBoxes,
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
