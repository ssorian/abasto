import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { presentations, products } from '#/modules/catalog/db/schema'
import {
  assertCents,
  lockOpenSession,
  postCashMovement,
} from '#/modules/cash/services/cash-ledger'
import { lots } from '#/modules/inventory/db/schema'
import {
  appendMovement,
  fitsInt4,
  requireWarehouse,
} from '#/modules/inventory/services/stock-ledger'
import type { Tx } from '#/modules/inventory/services/stock-ledger'
import { now } from '#/modules/orders/services/clock'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'
import {
  byFifo,
  fifoPlanner,
  readSellableLots,
  reserveAllocations,
} from '#/modules/orders/services/order-allocation'
import {
  lockLotsInOrder,
  releaseLots,
} from '#/modules/orders/services/reservations'
import { readWarehousePrices } from '#/modules/pricing/services/price-reads'
import {
  riderAllocations,
  riderAssignmentLines,
  riderAssignments,
  riders,
} from '#/modules/riders/db/schema'
import { priceSold } from '#/modules/riders/lib/allocation-pricing'
import { isUuid, toBaseUnits } from '#/modules/riders/lib/quantities'
import type { BoxesAndUnits } from '#/modules/riders/lib/quantities'
import {
  assignmentNotFound,
  readAssignment,
  warehouseOfAssignment,
} from '#/modules/riders/services/assignment-reads'
import type { AssignmentDetail } from '#/modules/riders/services/assignment-reads'
import { riderNotFound } from '#/modules/riders/services/riders'

export type AssignLineInput = BoxesAndUnits & { productId: string }
export type SettleLineInput = BoxesAndUnits & { lineId: string }

const notEnRoute = () =>
  new AppError('conflict', 'Este reparto ya no está en ruta.')

/**
 * Locks the assignment row and checks it is still "En ruta". The status guard
 * under the lock is what makes settle and cancel run at most once, together.
 */
async function lockOpenAssignment(tx: Tx, assignmentId: string) {
  const assignment = (
    await tx
      .select()
      .from(riderAssignments)
      .where(eq(riderAssignments.id, assignmentId))
      .for('update')
  ).at(0)
  if (!assignment) throw assignmentNotFound()
  if (assignment.status !== 'En ruta') throw notEnRoute()
  return assignment
}

function validateAssignLines(lines: ReadonlyArray<AssignLineInput>) {
  if (!lines.length) {
    throw new AppError('invalid', 'Agrega al menos un producto al reparto.')
  }
  if (new Set(lines.map((line) => line.productId)).size !== lines.length) {
    throw new AppError('invalid', 'No repitas el mismo producto en el reparto.')
  }
  if (lines.some((line) => !isUuid(line.productId))) {
    throw new AppError('not_found', 'No encontramos ese producto.')
  }
}

type ProductInfo = {
  name: string
  boxFactor: number
  defaultPresentationId: string | null
  defaultFactor: number
  pieceId: string | null
}

/** Name, box (largest active presentation) and default presentation of each product. */
async function readProducts(tx: Tx, productIds: Array<string>) {
  const rows = await tx
    .select({
      productId: products.id,
      name: products.name,
      presentationId: presentations.id,
      factor: presentations.factor,
      isDefault: presentations.isDefault,
      active: presentations.active,
    })
    .from(products)
    .leftJoin(presentations, eq(presentations.productId, products.id))
    .where(inArray(products.id, productIds))
  const info = new Map<string, ProductInfo>()
  for (const row of rows) {
    const current = info.get(row.productId) ?? {
      name: row.name,
      boxFactor: 1,
      defaultPresentationId: null,
      defaultFactor: 1,
      pieceId: null,
    }
    if (row.presentationId && row.active) {
      current.boxFactor = Math.max(current.boxFactor, row.factor ?? 1)
    }
    if (row.presentationId && row.active && row.factor === 1) {
      current.pieceId = row.presentationId
    }
    if (row.presentationId && row.isDefault) {
      current.defaultPresentationId = row.presentationId
      current.defaultFactor = row.factor ?? 1
    }
    info.set(row.productId, current)
  }
  return info
}

/**
 * Hands stock to a rider: converts boxes + units to base units, reserves the
 * product's lots FIFO (the order rules: expired lots excluded, no overselling,
 * same locks) and freezes the sale price of every allocation. Nothing is sold
 * and no cash moves until settlement.
 */
export async function assignRider(
  actor: Actor,
  input: { riderId: string; lines: ReadonlyArray<AssignLineInput> },
): Promise<AssignmentDetail> {
  if (!isUuid(input.riderId)) throw riderNotFound()
  const head = (
    await db
      .select({ warehouseId: riders.warehouseId })
      .from(riders)
      .where(eq(riders.id, input.riderId))
  ).at(0)
  if (!head) throw riderNotFound()
  authorize(actor, 'warehouse.operate', head.warehouseId)
  validateAssignLines(input.lines)
  const { warehouseId } = head
  return db.transaction(async (tx) => {
    await requireWarehouse(tx, warehouseId)
    await expireOverdueOrders(tx, warehouseId)
    const rider = (
      await tx
        .select()
        .from(riders)
        .where(eq(riders.id, input.riderId))
        .for('update')
    ).at(0)
    if (!rider) throw riderNotFound()
    if (!rider.active) {
      throw new AppError('conflict', 'Este repartidor está inactivo.')
    }
    const open = await tx
      .select({ id: riderAssignments.id })
      .from(riderAssignments)
      .where(
        and(
          eq(riderAssignments.riderId, rider.id),
          eq(riderAssignments.status, 'En ruta'),
        ),
      )
    if (open.length) {
      throw new AppError(
        'conflict',
        'Este repartidor ya tiene un reparto en ruta.',
      )
    }
    const productIds = input.lines.map((line) => line.productId)
    const info = await readProducts(tx, productIds)
    const wanted = input.lines.map((line) => {
      const product = info.get(line.productId)
      if (!product)
        throw new AppError('not_found', 'No encontramos ese producto.')
      const baseQuantity = toBaseUnits(line, product.boxFactor)
      if (baseQuantity < 1) {
        throw new AppError(
          'invalid',
          `Indica cuántas cajas o unidades de ${product.name}.`,
        )
      }
      return { productId: line.productId, product, baseQuantity }
    })
    const sellable = await readSellableLots(tx, warehouseId, productIds, {
      lock: true,
    })
    const lotById = new Map(sellable.map((lot) => [lot.id, lot]))
    const prices = await readWarehousePrices(tx, warehouseId)
    const standard = new Map(
      prices.map((row) => [row.presentationId, row.priceCents]),
    )
    // Only a price set for the piece itself counts: a derived one is just the
    // prorated box price and would add rounding without meaning.
    const ownPiece = new Map(
      prices
        .filter((row) => row.origin === 'own')
        .map((row) => [row.presentationId, row.priceCents]),
    )
    const plan = fifoPlanner(sellable)
    const plans = wanted.map((line) => ({
      productName: line.product.name,
      ...plan(line.productId, line.baseQuantity),
    }))
    const allocations = await reserveAllocations(tx, plans)
    const [assignment] = await tx
      .insert(riderAssignments)
      .values({
        warehouseId,
        riderId: rider.id,
        status: 'En ruta',
        createdBy: actor.userId,
        createdAt: now(),
      })
      .returning({ id: riderAssignments.id })
    for (const [index, line] of wanted.entries()) {
      const [stored] = await tx
        .insert(riderAssignmentLines)
        .values({
          assignmentId: assignment.id,
          productId: line.productId,
          boxFactor: line.product.boxFactor,
          assignedQuantity: line.baseQuantity,
        })
        .returning({ id: riderAssignmentLines.id })
      await tx.insert(riderAllocations).values(
        allocations[index].map(({ lotId, quantity }) => {
          const priceCents =
            lotById.get(lotId)?.salePriceCents ??
            (line.product.defaultPresentationId
              ? standard.get(line.product.defaultPresentationId)
              : null)
          if (priceCents == null) {
            throw new AppError(
              'conflict',
              `${line.product.name} no tiene precio en este almacén.`,
            )
          }
          // A product sold by the piece by default has one price already.
          const pieceCents =
            line.product.defaultFactor > 1 && line.product.pieceId
              ? (ownPiece.get(line.product.pieceId) ?? null)
              : null
          return {
            lineId: stored.id,
            lotId,
            quantity,
            priceCents,
            priceFactor: line.product.defaultFactor,
            pieceCents,
          }
        }),
      )
    }
    return readAssignment(tx, assignment.id)
  })
}

/** Cancels an "En ruta" assignment and gives every reserved unit back. */
export async function cancelAssignment(
  actor: Actor,
  input: { assignmentId: string },
): Promise<AssignmentDetail> {
  const warehouseId = await warehouseOfAssignment(db, input.assignmentId)
  authorize(actor, 'warehouse.operate', warehouseId)
  return db.transaction(async (tx) => {
    await expireOverdueOrders(tx, warehouseId)
    await lockOpenAssignment(tx, input.assignmentId)
    const held = await tx
      .select({
        lotId: riderAllocations.lotId,
        quantity: riderAllocations.quantity,
      })
      .from(riderAllocations)
      .innerJoin(
        riderAssignmentLines,
        eq(riderAssignmentLines.id, riderAllocations.lineId),
      )
      .where(eq(riderAssignmentLines.assignmentId, input.assignmentId))
    const perLot = new Map<string, number>()
    for (const { lotId, quantity } of held) {
      perLot.set(lotId, (perLot.get(lotId) ?? 0) + quantity)
    }
    await releaseLots(tx, perLot)
    await tx
      .update(riderAssignments)
      .set({ status: 'Cancelada', closedBy: actor.userId, closedAt: now() })
      .where(eq(riderAssignments.id, input.assignmentId))
    return readAssignment(tx, input.assignmentId)
  })
}

/**
 * Closes the day: the leftover goes back to available stock in the same lots,
 * the sold remainder (assigned − leftover, taken from the oldest allocations
 * first) is a `sale` movement per allocation, and its value at the frozen
 * prices is one cash `sale` in the warehouse's open drawer. The difference
 * with the cash the rider handed in is stored and, when not zero, posted as
 * its own `rider_difference` movement naming the rider. All or nothing, and
 * only once.
 */
export async function settleAssignment(
  actor: Actor,
  input: {
    assignmentId: string
    deliveredCents: number
    lines: ReadonlyArray<SettleLineInput>
  },
): Promise<AssignmentDetail> {
  const warehouseId = await warehouseOfAssignment(db, input.assignmentId)
  authorize(actor, 'warehouse.operate', warehouseId)
  assertCents(input.deliveredCents)
  return db.transaction(async (tx) => {
    await expireOverdueOrders(tx, warehouseId)
    const assignment = await lockOpenAssignment(tx, input.assignmentId)
    const lines = await tx
      .select()
      .from(riderAssignmentLines)
      .where(eq(riderAssignmentLines.assignmentId, assignment.id))
      .orderBy(asc(riderAssignmentLines.id))
    const leftoverOf = new Map<string, number>()
    for (const entry of input.lines) {
      const line = lines.find((candidate) => candidate.id === entry.lineId)
      if (!line || leftoverOf.has(line.id)) {
        throw new AppError(
          'invalid',
          'Revisa las líneas del reparto: cada producto va una sola vez.',
        )
      }
      const leftover = toBaseUnits(entry, line.boxFactor)
      if (leftover > line.assignedQuantity) {
        throw new AppError(
          'invalid',
          'Lo que regresó no puede ser más de lo que se asignó.',
        )
      }
      leftoverOf.set(line.id, leftover)
    }
    if (leftoverOf.size !== lines.length) {
      throw new AppError(
        'invalid',
        'Indica lo que regresó de cada producto del reparto.',
      )
    }
    const session = await lockOpenSession(tx, warehouseId)
    const allocations = await tx
      .select({
        id: riderAllocations.id,
        lineId: riderAllocations.lineId,
        lotId: riderAllocations.lotId,
        receivedAt: lots.receivedAt,
        quantity: riderAllocations.quantity,
        priceCents: riderAllocations.priceCents,
        priceFactor: riderAllocations.priceFactor,
        pieceCents: riderAllocations.pieceCents,
      })
      .from(riderAllocations)
      .innerJoin(lots, eq(lots.id, riderAllocations.lotId))
      .where(
        inArray(
          riderAllocations.lineId,
          lines.map((line) => line.id),
        ),
      )
    const locked = await lockLotsInOrder(
      tx,
      allocations.map((a) => a.lotId),
    )
    const released = new Map<string, number>()
    let expectedCents = 0
    for (const line of lines) {
      const own = allocations
        .filter((a) => a.lineId === line.id)
        .sort((a, b) =>
          byFifo(
            { receivedAt: a.receivedAt, id: a.lotId },
            { receivedAt: b.receivedAt, id: b.lotId },
          ),
        )
      // Whole boxes at the box price, loose pieces at the piece price.
      const priced = priceSold(
        own,
        line.assignedQuantity - leftoverOf.get(line.id)!,
      )
      for (const [position, allocation] of own.entries()) {
        const { sold, cents } = priced[position]
        const leftover = allocation.quantity - sold
        if (sold > 0) {
          await appendMovement(
            tx,
            locked.get(allocation.lotId)!,
            {
              type: 'sale',
              quantity: -sold,
              reason: 'Reparto liquidado',
              reference: assignment.id,
              actorId: actor.userId,
            },
            { fromReserved: true },
          )
          expectedCents += cents
        }
        if (leftover > 0) {
          released.set(
            allocation.lotId,
            (released.get(allocation.lotId) ?? 0) + leftover,
          )
        }
        await tx
          .update(riderAllocations)
          .set({ soldQuantity: sold, leftoverQuantity: leftover })
          .where(eq(riderAllocations.id, allocation.id))
      }
      await tx
        .update(riderAssignmentLines)
        .set({ leftoverQuantity: leftoverOf.get(line.id)! })
        .where(eq(riderAssignmentLines.id, line.id))
    }
    await releaseLots(tx, released)
    if (!fitsInt4(expectedCents)) {
      throw new AppError('invalid', 'El total del reparto es demasiado grande.')
    }
    // The drawer records the sale at the sold value (what Reports show); a
    // shortage or surplus against the cash handed in is its own movement, so
    // the net cash in is exactly what the rider handed in.
    const difference = input.deliveredCents - expectedCents
    const sale =
      expectedCents > 0
        ? await postCashMovement(tx, session, {
            type: 'sale',
            amountCents: expectedCents,
            reason: 'Reparto liquidado',
            actorId: actor.userId,
          })
        : null
    const [rider] = await tx
      .select({ name: riders.name })
      .from(riders)
      .where(eq(riders.id, assignment.riderId))
    const differenceMovement =
      difference === 0
        ? null
        : await postCashMovement(tx, session, {
            type: 'rider_difference',
            amountCents: difference,
            reason: `${difference < 0 ? 'Faltante' : 'Sobrante'} de reparto · ${rider.name}`,
            actorId: actor.userId,
          })
    await tx
      .update(riderAssignments)
      .set({
        status: 'Liquidada',
        closedBy: actor.userId,
        closedAt: now(),
        expectedCents,
        deliveredCents: input.deliveredCents,
        differenceCents: difference,
        cashMovementId: sale?.id ?? null,
        differenceMovementId: differenceMovement?.id ?? null,
      })
      .where(eq(riderAssignments.id, assignment.id))
    return readAssignment(tx, assignment.id)
  })
}
