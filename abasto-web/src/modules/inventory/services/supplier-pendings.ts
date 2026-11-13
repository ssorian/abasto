import { desc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import type { Actor } from '#/modules/access/lib/policy'
import { supplierPendings } from '#/modules/inventory/db/schema'
import type {
  PendingKind,
  PendingType,
  ReturnResolution,
} from '#/modules/inventory/db/schema'
import { openOf, settleBoxes } from '#/modules/inventory/lib/pending-value'
import {
  authorizeSupplierBalance,
  balanceNotFound,
  loadBalances,
  lockSupplier,
  settleBalance,
} from '#/modules/inventory/services/supplier-balance'
import type { Balance } from '#/modules/inventory/services/supplier-balance'

/** An open "Por reponer" (kind restock) or "Por devolver" (kind return) balance. */
export type PendingBalance = {
  /** Id of the origin ledger entry: what replacements, discounts, write-offs and returns refer to. */
  pendingId: string
  kind: PendingKind
  supplierId: string
  supplierName: string
  productId: string
  productName: string
  sku: string
  /** Order that caused it and its lot code (reference or `PED-0001`). */
  purchaseId: string | null
  originCode: string
  /** Pieces per box of the order line that owes it. */
  boxFactor: number
  /** Boxes it started with. */
  originalBoxes: number
  /** Base units still open; always positive here. */
  owedQuantity: number
  owedBoxes: number
  owedValueCents: number
  createdAt: Date
}

export type PendingEntry = {
  id: string
  supplierId: string
  productId: string
  purchaseId: string | null
  settlesId: string | null
  type: PendingType
  quantity: number
  valueCents: number
  resolution: ReturnResolution | null
  creditCents: number | null
  actorId: string
  createdAt: Date
}

function toPendingBalance(balance: Balance): PendingBalance {
  const open = openOf(balance)
  return {
    pendingId: balance.id,
    kind: balance.kind,
    supplierId: balance.supplierId,
    supplierName: balance.supplierName,
    productId: balance.productId,
    productName: balance.productName,
    sku: balance.sku,
    purchaseId: balance.purchaseId,
    originCode: balance.originCode,
    boxFactor: balance.boxFactor,
    originalBoxes: Math.floor(balance.quantity / balance.boxFactor),
    owedQuantity: open.units,
    owedBoxes: open.boxes,
    owedValueCents: balance.valueCents - balance.settledValueCents,
    createdAt: balance.createdAt,
  }
}

/**
 * Open balances of a supplier (all suppliers without `supplierId`), split into
 * "Por reponer" (`restock`: boxes that never arrived) and "Por devolver"
 * (`returns`: boxes that arrived unsellable), oldest first, plus the ledger
 * entries behind them (newest first). Balances of fully settled entries are
 * not listed.
 */
export async function listSupplierPendings(
  actor: Actor,
  supplierId?: string,
): Promise<{
  restock: Array<PendingBalance>
  returns: Array<PendingBalance>
  history: Array<PendingEntry>
}> {
  authorizeSupplierBalance(actor)
  const open = (await loadBalances(db, { supplierId }))
    .filter((balance) => openOf(balance).units > 0)
    .map(toPendingBalance)
  const history = await db
    .select()
    .from(supplierPendings)
    .where(supplierId ? eq(supplierPendings.supplierId, supplierId) : undefined)
    .orderBy(desc(supplierPendings.createdAt), desc(supplierPendings.id))
  return {
    restock: open.filter((row) => row.kind === 'restock'),
    returns: open.filter((row) => row.kind === 'return'),
    history,
  }
}

/** Finds the origin entry, then locks its supplier and reads it again under the lock. */
async function lockedBalance(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  pendingId: string,
) {
  const first = (await loadBalances(tx, { ids: [pendingId] })).at(0)
  if (!first) throw balanceNotFound()
  await lockSupplier(tx, first.supplierId)
  return (await loadBalances(tx, { ids: [pendingId] }))[0]
}

const badBoxes = (verb: string) =>
  new AppError(
    'invalid',
    `Las cajas a ${verb} deben ser un número entero mayor que cero.`,
  )

/**
 * Closes boxes of a "Por devolver" balance because the supplier took them
 * back, either replacing them or crediting an amount (a discount; by default
 * the original value of the boxes). Nothing enters stock here.
 */
export async function returnPendings(
  actor: Actor,
  input: {
    pendingId: string
    boxes: number
    resolution: ReturnResolution
    /** Discount only: the amount the supplier credited, in cents. */
    creditCents?: number
  },
): Promise<{ valueCents: number; creditCents: number | null }> {
  authorizeSupplierBalance(actor)
  if (!Number.isSafeInteger(input.boxes) || input.boxes <= 0) {
    throw badBoxes('devolver')
  }
  if (input.resolution !== 'discount' && input.creditCents !== undefined) {
    throw new AppError('invalid', 'Solo un descuento lleva monto.')
  }
  if (
    input.creditCents !== undefined &&
    (!Number.isSafeInteger(input.creditCents) || input.creditCents < 0)
  ) {
    throw new AppError(
      'invalid',
      'El monto del descuento debe ser un entero de cero o más.',
    )
  }
  return db.transaction(async (tx) => {
    const balance = await lockedBalance(tx, input.pendingId)
    if (balance.kind !== 'return') {
      throw new AppError(
        'invalid',
        'Solo se pueden devolver cajas dañadas o caducadas.',
      )
    }
    const tooMany = () =>
      new AppError(
        'invalid',
        'Las cajas a devolver superan el saldo del proveedor.',
      )
    const preview = settleBoxes(balance, input.boxes)
    if (!preview) throw tooMany()
    const creditCents =
      input.resolution === 'discount'
        ? (input.creditCents ?? preview.valueCents)
        : null
    const { valueCents } = await settleBalance(
      tx,
      {
        balance,
        boxes: input.boxes,
        type: 'returned',
        purchaseId: null,
        actorId: actor.userId,
        resolution: input.resolution,
        creditCents,
      },
      tooMany,
    )
    return { valueCents, creditCents }
  })
}
