import { asc, desc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { products } from '#/modules/catalog/db/schema'
import { lots } from '#/modules/inventory/db/schema'
import { byFifo } from '#/modules/orders/services/order-allocation'
import {
  riderAllocations,
  riderAssignmentLines,
  riderAssignments,
  riders,
} from '#/modules/riders/db/schema'
import type { AssignmentStatus } from '#/modules/riders/db/schema'
import { isUuid } from '#/modules/riders/lib/quantities'
import { requireWarehouseId } from '#/modules/riders/services/riders'

type Executor = Pick<typeof db, 'select'>

export type AssignmentSummary = {
  id: string
  warehouseId: string
  riderId: string
  riderName: string
  status: AssignmentStatus
  createdAt: Date
  closedAt: Date | null
  expectedCents: number | null
  deliveredCents: number | null
  differenceCents: number | null
}

export type AllocationDetail = {
  lotId: string
  quantity: number
  /** Frozen price of one default presentation of the lot. */
  priceCents: number
  priceFactor: number
  leftoverQuantity: number | null
  soldQuantity: number | null
}

export type AssignmentLineDetail = {
  id: string
  productId: string
  productName: string
  boxFactor: number
  /** Base units. */
  assignedQuantity: number
  leftoverQuantity: number | null
  soldQuantity: number | null
  allocations: Array<AllocationDetail>
}

export type AssignmentDetail = AssignmentSummary & {
  createdBy: string
  closedBy: string | null
  cashMovementId: string | null
  lines: Array<AssignmentLineDetail>
}

export const assignmentNotFound = () =>
  new AppError('not_found', 'No encontramos ese reparto.')

const summaryColumns = {
  id: riderAssignments.id,
  warehouseId: riderAssignments.warehouseId,
  riderId: riderAssignments.riderId,
  riderName: riders.name,
  status: riderAssignments.status,
  createdAt: riderAssignments.createdAt,
  closedAt: riderAssignments.closedAt,
  expectedCents: riderAssignments.expectedCents,
  deliveredCents: riderAssignments.deliveredCents,
  differenceCents: riderAssignments.differenceCents,
}

/** Warehouse of an assignment, or not found for a missing or malformed id. */
export async function warehouseOfAssignment(
  executor: Executor,
  assignmentId: string,
): Promise<string> {
  if (!isUuid(assignmentId)) throw assignmentNotFound()
  const found = (
    await executor
      .select({ warehouseId: riderAssignments.warehouseId })
      .from(riderAssignments)
      .where(eq(riderAssignments.id, assignmentId))
  ).at(0)
  if (!found) throw assignmentNotFound()
  return found.warehouseId
}

/** The assignment with its lines and per-lot allocations (oldest lot first). */
export async function readAssignment(
  executor: Executor,
  assignmentId: string,
): Promise<AssignmentDetail> {
  const head = (
    await executor
      .select({
        ...summaryColumns,
        createdBy: riderAssignments.createdBy,
        closedBy: riderAssignments.closedBy,
        cashMovementId: riderAssignments.cashMovementId,
      })
      .from(riderAssignments)
      .innerJoin(riders, eq(riders.id, riderAssignments.riderId))
      .where(eq(riderAssignments.id, assignmentId))
  ).at(0)
  if (!head) throw assignmentNotFound()
  const lines = await executor
    .select({
      id: riderAssignmentLines.id,
      productId: riderAssignmentLines.productId,
      productName: products.name,
      boxFactor: riderAssignmentLines.boxFactor,
      assignedQuantity: riderAssignmentLines.assignedQuantity,
      leftoverQuantity: riderAssignmentLines.leftoverQuantity,
    })
    .from(riderAssignmentLines)
    .innerJoin(products, eq(products.id, riderAssignmentLines.productId))
    .where(eq(riderAssignmentLines.assignmentId, assignmentId))
    .orderBy(asc(products.name), asc(riderAssignmentLines.id))
  const allocations = await executor
    .select({
      lineId: riderAllocations.lineId,
      lotId: riderAllocations.lotId,
      receivedAt: lots.receivedAt,
      quantity: riderAllocations.quantity,
      priceCents: riderAllocations.priceCents,
      priceFactor: riderAllocations.priceFactor,
      leftoverQuantity: riderAllocations.leftoverQuantity,
      soldQuantity: riderAllocations.soldQuantity,
    })
    .from(riderAllocations)
    .innerJoin(
      riderAssignmentLines,
      eq(riderAssignmentLines.id, riderAllocations.lineId),
    )
    .innerJoin(lots, eq(lots.id, riderAllocations.lotId))
    .where(eq(riderAssignmentLines.assignmentId, assignmentId))
  return {
    ...head,
    lines: lines.map((line) => ({
      ...line,
      soldQuantity:
        line.leftoverQuantity == null
          ? null
          : line.assignedQuantity - line.leftoverQuantity,
      allocations: allocations
        .filter((a) => a.lineId === line.id)
        .sort((a, b) =>
          byFifo(
            { receivedAt: a.receivedAt, id: a.lotId },
            { receivedAt: b.receivedAt, id: b.lotId },
          ),
        )
        .map(({ lineId: _lineId, receivedAt: _receivedAt, ...a }) => a),
    })),
  }
}

export async function getAssignment(
  actor: Actor,
  assignmentId: string,
): Promise<AssignmentDetail> {
  authorize(
    actor,
    'warehouse.view',
    await warehouseOfAssignment(db, assignmentId),
  )
  return readAssignment(db, assignmentId)
}

/** A warehouse's assignments, newest first, optionally of one status. */
export async function listAssignments(
  actor: Actor,
  input: { warehouseId: string; status?: AssignmentStatus },
): Promise<Array<AssignmentSummary>> {
  authorize(actor, 'warehouse.view', input.warehouseId)
  requireWarehouseId(input.warehouseId)
  const rows = await db
    .select(summaryColumns)
    .from(riderAssignments)
    .innerJoin(riders, eq(riders.id, riderAssignments.riderId))
    .where(eq(riderAssignments.warehouseId, input.warehouseId))
    .orderBy(desc(riderAssignments.createdAt), asc(riderAssignments.id))
  return input.status ? rows.filter((r) => r.status === input.status) : rows
}
