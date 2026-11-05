import { businessDate } from '#/modules/orders/services/clock'

type LedgerLike = {
  id: string
  type: 'charge' | 'abono'
  amountCents: number
  dueOn: string | null
  orderId: string | null
  createdAt: Date
}

export type AllocatedCharge = {
  id: string
  orderId: string | null
  amountCents: number
  /** Part of the charge covered by abonos, applied oldest charge first. */
  paidCents: number
  balanceCents: number
  dueOn: string | null
  /** Past its due day and not fully covered. */
  overdue: boolean
  createdAt: Date
}

/**
 * One customer's charges with what is still owed on each. Abonos cover the
 * charges oldest first (the order of `entries`), whatever their due date, the
 * same rule `overdueOf` uses for the customer total.
 */
export function allocateCharges(
  entries: ReadonlyArray<LedgerLike>,
  today: string,
): Array<AllocatedCharge> {
  let paid = entries
    .filter((entry) => entry.type === 'abono')
    .reduce((sum, entry) => sum + entry.amountCents, 0)
  return entries
    .filter((entry) => entry.type === 'charge')
    .map((entry) => {
      const covered = Math.min(paid, entry.amountCents)
      paid -= covered
      const balanceCents = entry.amountCents - covered
      return {
        id: entry.id,
        orderId: entry.orderId,
        amountCents: entry.amountCents,
        paidCents: covered,
        balanceCents,
        dueOn: entry.dueOn,
        overdue:
          balanceCents > 0 && entry.dueOn !== null && entry.dueOn < today,
        createdAt: entry.createdAt,
      }
    })
}

/** A credit order picked up by a customer, as Cobros lists it. */
export type ChargeRow = AllocatedCharge & {
  customerId: string
  customerName: string
  warehouseName: string
}

/** Cash a customer paid into a drawer. */
export type AbonoRow = {
  id: string
  customerId: string
  customerName: string
  warehouseName: string
  amountCents: number
  createdAt: Date
}

export const collectionViews = [
  'Pendientes',
  'Vencidos',
  'Pagados',
  'Todos',
] as const
export type CollectionView = (typeof collectionViews)[number]

const byDueDate = (a: ChargeRow, b: ChargeRow) =>
  (a.dueOn ?? '').localeCompare(b.dueOn ?? '') ||
  a.createdAt.getTime() - b.createdAt.getTime()

/** Charges of one view (and optionally one customer), the earliest due first. */
export function filterCharges(
  rows: ReadonlyArray<ChargeRow>,
  { view, customerId }: { view: CollectionView; customerId?: string },
): Array<ChargeRow> {
  const shown = {
    Pendientes: (row: ChargeRow) => row.balanceCents > 0,
    Vencidos: (row: ChargeRow) => row.overdue,
    Pagados: (row: ChargeRow) => row.balanceCents === 0,
    Todos: () => true,
  }[view]
  return rows
    .filter((row) => !customerId || row.customerId === customerId)
    .filter(shown)
    .sort(byDueDate)
}

export type CollectionMetrics = {
  balanceCents: number
  overdueCents: number
  /** Owed but not yet due. */
  currentCents: number
  /** Abonos received today in the business time zone. */
  receivedTodayCents: number
}

export function collectionMetrics(
  charges: ReadonlyArray<Pick<ChargeRow, 'balanceCents' | 'overdue'>>,
  abonos: ReadonlyArray<Pick<AbonoRow, 'amountCents' | 'createdAt'>>,
  today: string,
): CollectionMetrics {
  const sum = (values: Array<number>) => values.reduce((a, b) => a + b, 0)
  const balanceCents = sum(charges.map((row) => row.balanceCents))
  const overdueCents = sum(
    charges.filter((row) => row.overdue).map((row) => row.balanceCents),
  )
  return {
    balanceCents,
    overdueCents,
    currentCents: balanceCents - overdueCents,
    receivedTodayCents: sum(
      abonos
        .filter((abono) => businessDate(abono.createdAt) === today)
        .map((abono) => abono.amountCents),
    ),
  }
}

/** Whole calendar days from a due day (YYYY-MM-DD) to today. */
export const daysOverdue = (dueOn: string, today: string) =>
  Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dueOn}T00:00:00Z`)) /
      86_400_000,
  )
