import type { CashSessionDetail } from '#/modules/cash/services/cash-sessions'
import type { AssignableProduct } from '#/modules/riders/lib/assign-draft'
import type { AssignmentDetail } from '#/modules/riders/services/assignment-reads'
import type { Rider } from '#/modules/riders/services/riders'

export type RiderWarehouse = { id: string; name: string }

/** Everything Repartos needs for one warehouse. */
export type RidersOverview = {
  /** Warehouses the actor can operate. */
  warehouses: Array<RiderWarehouse>
  selectedId: string | null
  /** Server time, so dates render the same on server and client. */
  now: Date
  /** Only the owner and the warehouse's manager edit the riders catalog. */
  canManage: boolean
  riders: Array<Rider>
  /** The warehouse's open drawer; settling needs it. */
  cash: CashSessionDetail | null
  /** Open assignments plus today's, newest first, with their lines. */
  assignments: Array<AssignmentDetail>
  /** Products with stock to hand out, with the box factor used. */
  products: Array<AssignableProduct>
}
