import { orderCode } from '#/modules/counter/lib/order-format'
import { formatCents } from '#/modules/pricing/lib/money'

type EntryLike = {
  id: string
  type: 'charge' | 'abono'
  amountCents: number
  dueOn: string | null
  orderId: string | null
  balanceCents: number
  createdAt: Date
}

export type StatementRow = {
  id: string
  label: string
  /** Charges add to the debt; abonos show with a minus sign. */
  amount: string
  kind: 'charge' | 'abono'
  due: string
  balance: string
  date: Date
}

const day = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** A calendar day (YYYY-MM-DD) as "11 nov 2026", without time zone drift. */
export const dueLabel = (date: string) =>
  day.format(new Date(`${date}T00:00:00Z`)).replaceAll('.', '')

export function statementRows(
  entries: ReadonlyArray<EntryLike>,
  { newestFirst = false }: { newestFirst?: boolean } = {},
): Array<StatementRow> {
  const rows = entries.map((entry): StatementRow => {
    const charge = entry.type === 'charge'
    return {
      id: entry.id,
      label:
        charge && entry.orderId
          ? `Cargo · ${orderCode(entry.orderId)}`
          : charge
            ? 'Cargo'
            : 'Abono',
      amount: charge
        ? formatCents(entry.amountCents)
        : `-${formatCents(entry.amountCents)}`,
      kind: entry.type,
      due: charge && entry.dueOn ? `Vence ${dueLabel(entry.dueOn)}` : '',
      balance: formatCents(entry.balanceCents),
      date: entry.createdAt,
    }
  })
  return newestFirst ? rows.reverse() : rows
}

type Receivable = {
  balanceCents: number
  overdueCents: number
}

/** Customers that owe money: overdue first, then the larger balance. */
export function sortReceivables<T extends Receivable>(rows: ReadonlyArray<T>) {
  return rows
    .filter((row) => row.balanceCents > 0)
    .sort(
      (a, b) =>
        Number(b.overdueCents > 0) - Number(a.overdueCents > 0) ||
        b.balanceCents - a.balanceCents,
    )
}

/** 150050 → "1500.50" using digits only, ready for a pesos input. */
export const centsToPesosText = (cents: number) =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
