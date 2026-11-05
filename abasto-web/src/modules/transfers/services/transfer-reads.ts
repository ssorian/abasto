import { desc, eq, inArray, or } from 'drizzle-orm'
import { db } from '#/db'
import { user } from '#/db/auth-schema'
import { AppError } from '#/lib/errors'
import { authorize, can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { products } from '#/modules/catalog/db/schema'
import { lots } from '#/modules/inventory/db/schema'
import { transferLines, transfers } from '#/modules/transfers/db/schema'
import type { TransferStatus } from '#/modules/transfers/db/schema'
import { transferNotFound } from '#/modules/transfers/services/transfer-lookup'
import { warehouses } from '#/modules/warehouses/db/schema'

export type TransferLineView = {
  id: string
  productId: string
  productName: string
  sku: string
  unit: string
  lotCode: string
  expiresOn: string | null
  /** Base units sent. */
  quantity: number
  /** Base units received; null until the transfer is received. */
  receivedQuantity: number | null
}

export type TransferView = {
  id: string
  status: TransferStatus
  fromWarehouseId: string
  fromWarehouseName: string
  toWarehouseId: string
  toWarehouseName: string
  notes: string
  createdByName: string
  createdAt: Date
  closedByName: string | null
  closedAt: Date | null
  lines: Array<TransferLineView>
  sentTotal: number
  /** Null while in transit or after a cancellation. */
  receivedTotal: number | null
  /** Sent minus received; zero unless the transfer was received with a difference. */
  shortage: number
}

export type TransferListItem = TransferView & { direction: 'out' | 'in' }

/** How many transfers a warehouse list returns. */
const LIST_LIMIT = 200

async function hydrate(
  rows: Array<typeof transfers.$inferSelect>,
): Promise<Array<TransferView>> {
  if (!rows.length) return []
  const ids = rows.map((row) => row.id)
  const [lineRows, warehouseRows, userRows] = await Promise.all([
    db
      .select({
        id: transferLines.id,
        transferId: transferLines.transferId,
        productId: transferLines.productId,
        productName: products.name,
        sku: products.sku,
        unit: products.unit,
        lotCode: lots.code,
        expiresOn: lots.expiresOn,
        quantity: transferLines.quantity,
        receivedQuantity: transferLines.receivedQuantity,
      })
      .from(transferLines)
      .innerJoin(products, eq(products.id, transferLines.productId))
      .innerJoin(lots, eq(lots.id, transferLines.sourceLotId))
      .where(inArray(transferLines.transferId, ids))
      .orderBy(products.name, lots.expiresOn, transferLines.id),
    db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses),
    db.select({ id: user.id, name: user.name }).from(user),
  ])
  const warehouseNames = new Map(warehouseRows.map((row) => [row.id, row.name]))
  const userNames = new Map(userRows.map((row) => [row.id, row.name]))
  return rows.map((row) => {
    const lines = lineRows
      .filter((line) => line.transferId === row.id)
      .map(({ transferId: _transferId, ...line }) => line)
    const sentTotal = lines.reduce((sum, line) => sum + line.quantity, 0)
    const received = row.status.startsWith('Recibido')
    const receivedTotal = received
      ? lines.reduce((sum, line) => sum + (line.receivedQuantity ?? 0), 0)
      : null
    return {
      id: row.id,
      status: row.status,
      fromWarehouseId: row.fromWarehouseId,
      fromWarehouseName: warehouseNames.get(row.fromWarehouseId) ?? '',
      toWarehouseId: row.toWarehouseId,
      toWarehouseName: warehouseNames.get(row.toWarehouseId) ?? '',
      notes: row.notes,
      createdByName: userNames.get(row.createdBy) ?? '',
      createdAt: row.createdAt,
      closedByName: row.closedBy ? (userNames.get(row.closedBy) ?? '') : null,
      closedAt: row.closedAt,
      lines,
      sentTotal,
      receivedTotal,
      shortage: receivedTotal === null ? 0 : sentTotal - receivedTotal,
    }
  })
}

/** Transfers leaving or arriving at a warehouse, newest first. */
export async function listWarehouseTransfers(
  actor: Actor,
  warehouseId: string,
): Promise<Array<TransferListItem>> {
  authorize(actor, 'warehouse.view', warehouseId)
  const rows = await db
    .select()
    .from(transfers)
    .where(
      or(
        eq(transfers.fromWarehouseId, warehouseId),
        eq(transfers.toWarehouseId, warehouseId),
      ),
    )
    .orderBy(desc(transfers.createdAt), desc(transfers.id))
    .limit(LIST_LIMIT)
  return (await hydrate(rows)).map((view) => ({
    ...view,
    direction: view.fromWarehouseId === warehouseId ? 'out' : 'in',
  }))
}

/** One transfer; visible to anyone who can see either warehouse. */
export async function getTransfer(
  actor: Actor,
  transferId: string,
): Promise<TransferView> {
  const row = (
    await db.select().from(transfers).where(eq(transfers.id, transferId))
  ).at(0)
  if (!row) throw transferNotFound()
  if (
    !can(actor, 'warehouse.view', row.fromWarehouseId) &&
    !can(actor, 'warehouse.view', row.toWarehouseId)
  ) {
    throw new AppError('forbidden', 'No tienes permiso para esta acción.')
  }
  return (await hydrate([row]))[0]
}

/** Warehouses a manager of `fromWarehouseId` can send to: all the others. */
export async function listTransferDestinations(
  actor: Actor,
  fromWarehouseId: string,
): Promise<Array<{ id: string; name: string }>> {
  authorize(actor, 'warehouse.manage', fromWarehouseId)
  const all = await db
    .select({ id: warehouses.id, name: warehouses.name })
    .from(warehouses)
    .orderBy(warehouses.name)
  return all.filter((warehouse) => warehouse.id !== fromWarehouseId)
}
