import type { StatusTone } from '#/components/status-badge'
import { businessDate } from '#/modules/orders/services/clock'
import type { AssignmentStatus } from '#/modules/riders/db/schema'
import { formatCents } from '#/modules/pricing/lib/money'

const tones: Record<AssignmentStatus, StatusTone> = {
  'En ruta': 'blue',
  Liquidada: 'green',
  Cancelada: 'gray',
}

export const statusTone = (status: AssignmentStatus) => tones[status]

/** Shortage or surplus of the cash a rider handed in, in words. */
export function differenceLabel(differenceCents: number) {
  if (differenceCents === 0) return 'Sin diferencia'
  return differenceCents < 0
    ? `Faltante ${formatCents(-differenceCents)}`
    : `Sobrante ${formatCents(differenceCents)}`
}

/**
 * What Repartos shows by default: everything still "En ruta" (however old)
 * plus what was created or closed today in the business time zone.
 */
export function currentAssignments<
  T extends {
    status: AssignmentStatus
    createdAt: Date
    closedAt: Date | null
  },
>(assignments: ReadonlyArray<T>, today: string): Array<T> {
  return assignments.filter(
    (a) =>
      a.status === 'En ruta' ||
      businessDate(a.createdAt) === today ||
      (a.closedAt !== null && businessDate(a.closedAt) === today),
  )
}
