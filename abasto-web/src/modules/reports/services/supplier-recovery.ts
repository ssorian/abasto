import { sql } from 'drizzle-orm'
import { db } from '#/db'
import type { Actor } from '#/modules/access/lib/policy'
import {
  inRange,
  periodRange,
  reportWarehouses,
  requireOwner,
  uuidList,
} from '#/modules/reports/services/report-scope'
import type { PeriodInput } from '#/modules/reports/types/reports'
import type { SupplierRecovery } from '#/modules/reports/types/supplier-recovery'

type Raw = {
  discounted: string
  replaced: string
  pending: string
  scrapped: string
  unrecognized: string
  inventory_loss: string
}

/**
 * Money with suppliers in the period: recovered (discounted in orders +
 * replaced), pending now and lost (merma, unrecognized returns, stock losses).
 * Supplier balances are company-wide: the warehouse filter only narrows the
 * stock losses. Owner only.
 */
export async function getSupplierRecovery(
  actor: Actor,
  input: {
    period: PeriodInput
    warehouseIds?: ReadonlyArray<string>
    supplierId?: string
  },
): Promise<SupplierRecovery> {
  requireOwner(actor)
  const range = periodRange(input.period)
  const warehouses = await reportWarehouses(actor, input.warehouseIds)
  const bySupplier = (column: string) =>
    input.supplierId
      ? sql`and ${sql.raw(column)}::text = ${input.supplierId}`
      : sql``
  const result = await db.execute<Raw>(sql`
    select
      (select coalesce(sum(-s.value_cents), 0)
        from supplier_pendings s
        join supplier_pendings o on o.id = s.settles_id
        where s.type in ('discounted', 'reopened')
          and o.type in ('missing', 'credit')
          and ${inRange(sql`s.created_at`, range)}
          ${bySupplier('s.supplier_id')}) as discounted,
      (select coalesce(sum(-s.value_cents), 0)
        from supplier_pendings s
        where (s.type = 'replaced'
            or (s.type = 'returned' and s.resolution = 'replacement'))
          and ${inRange(sql`s.created_at`, range)}
          ${bySupplier('s.supplier_id')}) as replaced,
      (select coalesce(sum(o.value_cents + coalesce((
          select sum(s.value_cents) from supplier_pendings s
          where s.settles_id = o.id), 0)), 0)
        from supplier_pendings o
        where o.type in ('missing', 'damaged', 'credit')
          ${bySupplier('o.supplier_id')}) as pending,
      (select coalesce(sum(-s.value_cents), 0)
        from supplier_pendings s
        where s.type = 'scrapped'
          and ${inRange(sql`s.created_at`, range)}
          ${bySupplier('s.supplier_id')}) as scrapped,
      (select coalesce(sum(greatest(0, -s.value_cents - coalesce(s.credit_cents, 0))), 0)
        from supplier_pendings s
        where s.type = 'returned' and s.resolution = 'discount'
          and ${inRange(sql`s.created_at`, range)}
          ${bySupplier('s.supplier_id')}) as unrecognized,
      (select coalesce(sum(round(abs(m.quantity)::numeric * l.received_cost_cents / l.received_quantity)), 0)
        from stock_movements m
        join lots l on l.id = m.lot_id
        join products p on p.id = m.product_id
        where m.type = 'loss'
          and m.warehouse_id in (${uuidList(warehouses.map((item) => item.id))})
          and ${inRange(sql`m.created_at`, range)}
          ${bySupplier('p.supplier_id')}) as inventory_loss`)
  const row = result.rows[0]
  const discountedCents = Number(row.discounted)
  const replacedCents = Number(row.replaced)
  const scrappedCents = Number(row.scrapped)
  const unrecognizedCents = Number(row.unrecognized)
  const inventoryLossCents = Number(row.inventory_loss)
  return {
    range,
    recoveredCents: discountedCents + replacedCents,
    discountedCents,
    replacedCents,
    pendingCents: Number(row.pending),
    lostCents: scrappedCents + unrecognizedCents + inventoryLossCents,
    scrappedCents,
    unrecognizedCents,
    inventoryLossCents,
  }
}
