import { can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { getOpenCashSession } from '#/modules/cash/services/cash-sessions'
import { now as clockNow, businessDate } from '#/modules/orders/services/clock'
import { currentAssignments } from '#/modules/riders/lib/assignment-view'
import { listAssignableProducts } from '#/modules/riders/services/assignable-products'
import {
  getAssignment,
  listAssignments,
} from '#/modules/riders/services/assignment-reads'
import { listRiders } from '#/modules/riders/services/riders'
import type { RidersOverview } from '#/modules/riders/lib/riders-view'
import { listWarehouses } from '#/modules/warehouses/services/warehouses'

/** The selected warehouse (or the first operable one) with riders and today's assignments. */
export async function getRidersOverview(
  actor: Actor,
  warehouseId?: string,
): Promise<RidersOverview> {
  const warehouses = (await listWarehouses(actor)).filter(({ id }) =>
    can(actor, 'warehouse.operate', id),
  )
  const selected =
    warehouses.find(({ id }) => id === warehouseId) ?? warehouses.at(0)
  const now = new Date()
  if (!selected) {
    return {
      warehouses,
      selectedId: null,
      now,
      canManage: false,
      riders: [],
      cash: null,
      assignments: [],
      products: [],
    }
  }
  const [riders, cash, summaries, products] = await Promise.all([
    listRiders(actor, { warehouseId: selected.id }),
    getOpenCashSession(actor, selected.id),
    listAssignments(actor, { warehouseId: selected.id }),
    listAssignableProducts(actor, selected.id),
  ])
  const assignments = await Promise.all(
    currentAssignments(summaries, businessDate(clockNow())).map(({ id }) =>
      getAssignment(actor, id),
    ),
  )
  return {
    warehouses,
    selectedId: selected.id,
    now,
    canManage: can(actor, 'warehouse.manage', selected.id),
    riders,
    cash,
    assignments,
    products,
  }
}
