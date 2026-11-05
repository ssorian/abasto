import { describe, expect, test } from 'bun:test'
import { overdueOf } from '#/modules/credit/services/credit-balance'
import {
  allocateCharges,
  collectionMetrics,
  daysOverdue,
  filterCharges,
} from '#/modules/credit/lib/collections'
import type { ChargeRow } from '#/modules/credit/lib/collections'

const at = new Date('2026-11-01T12:00:00Z')

const charge = (id: string, amountCents: number, dueOn: string) => ({
  id,
  type: 'charge' as const,
  amountCents,
  dueOn,
  orderId: `order-${id}`,
  createdAt: at,
})
const abono = (id: string, amountCents: number) => ({
  id,
  type: 'abono' as const,
  amountCents,
  dueOn: null,
  orderId: null,
  createdAt: at,
})

describe('allocateCharges', () => {
  test('abonos cover the oldest charges first, whatever their due date', () => {
    const entries = [
      charge('c1', 3000, '2026-11-10'),
      charge('c2', 2000, '2026-11-03'),
      abono('a1', 4000),
    ]
    expect(allocateCharges(entries, '2026-11-05')).toEqual([
      {
        id: 'c1',
        orderId: 'order-c1',
        amountCents: 3000,
        paidCents: 3000,
        balanceCents: 0,
        dueOn: '2026-11-10',
        overdue: false,
        createdAt: at,
      },
      {
        id: 'c2',
        orderId: 'order-c2',
        amountCents: 2000,
        paidCents: 1000,
        balanceCents: 1000,
        dueOn: '2026-11-03',
        overdue: true,
        createdAt: at,
      },
    ])
  })

  test('a charge is overdue only after its due day and while it has a balance', () => {
    const entries = [
      charge('due-today', 1000, '2026-11-05'),
      charge('paid-late', 500, '2026-11-01'),
      abono('a1', 1500),
      charge('late', 700, '2026-11-04'),
    ]
    const rows = allocateCharges(entries, '2026-11-05')
    expect(rows.map(({ id, overdue }) => [id, overdue])).toEqual([
      ['due-today', false],
      ['paid-late', false],
      ['late', true],
    ])
  })

  test('the overdue balances add up to the customer overdue amount', () => {
    const entries = [
      charge('c1', 3000, '2026-10-01'),
      abono('a1', 1200),
      charge('c2', 2500, '2026-10-20'),
      charge('c3', 900, '2026-12-01'),
      abono('a2', 800),
    ]
    const rows = allocateCharges(entries, '2026-11-05')
    const overdue = rows
      .filter((row) => row.overdue)
      .reduce((sum, row) => sum + row.balanceCents, 0)
    expect(overdue).toBe(overdueOf(entries, '2026-11-05'))
  })

  test('no entries means no charges', () => {
    expect(allocateCharges([], '2026-11-05')).toEqual([])
  })
})

const row = (overrides: Partial<ChargeRow>): ChargeRow => ({
  id: 'r',
  customerId: 'norte',
  customerName: 'Distribuidora Norte',
  orderId: 'order',
  warehouseName: 'Almacén A',
  amountCents: 1000,
  paidCents: 0,
  balanceCents: 1000,
  dueOn: '2026-11-10',
  overdue: false,
  createdAt: at,
  ...overrides,
})

const rows = [
  row({ id: 'pending', dueOn: '2026-11-12' }),
  row({
    id: 'late',
    customerId: 'sur',
    dueOn: '2026-11-01',
    overdue: true,
    balanceCents: 600,
    paidCents: 400,
  }),
  row({ id: 'paid', balanceCents: 0, paidCents: 1000, dueOn: '2026-10-01' }),
  row({ id: 'soon', dueOn: '2026-11-06', balanceCents: 300, paidCents: 700 }),
]
const ids = (list: Array<ChargeRow>) => list.map(({ id }) => id)

describe('filterCharges', () => {
  test('Pendientes: charges with a balance, the earliest due first', () => {
    expect(ids(filterCharges(rows, { view: 'Pendientes' }))).toEqual([
      'late',
      'soon',
      'pending',
    ])
  })

  test('Vencidos, Pagados and Todos', () => {
    expect(ids(filterCharges(rows, { view: 'Vencidos' }))).toEqual(['late'])
    expect(ids(filterCharges(rows, { view: 'Pagados' }))).toEqual(['paid'])
    expect(ids(filterCharges(rows, { view: 'Todos' }))).toEqual([
      'paid',
      'late',
      'soon',
      'pending',
    ])
  })

  test('a customer id keeps only that customer', () => {
    expect(
      ids(filterCharges(rows, { view: 'Todos', customerId: 'sur' })),
    ).toEqual(['late'])
  })
})

describe('collectionMetrics', () => {
  test('balance, overdue, not yet due and cash received today', () => {
    const abonos = [
      { amountCents: 400, createdAt: new Date('2026-11-05T17:00:00Z') },
      // 2026-11-05 01:00 UTC is still 2026-11-04 in Mexico City.
      { amountCents: 700, createdAt: new Date('2026-11-05T01:00:00Z') },
    ]
    expect(collectionMetrics(rows, abonos, '2026-11-05')).toEqual({
      balanceCents: 1900,
      overdueCents: 600,
      currentCents: 1300,
      receivedTodayCents: 400,
    })
  })

  test('everything is zero without charges or abonos', () => {
    expect(collectionMetrics([], [], '2026-11-05')).toEqual({
      balanceCents: 0,
      overdueCents: 0,
      currentCents: 0,
      receivedTodayCents: 0,
    })
  })
})

describe('daysOverdue', () => {
  test('whole calendar days after the due day', () => {
    expect(daysOverdue('2026-11-01', '2026-11-05')).toBe(4)
    expect(daysOverdue('2026-10-31', '2026-11-01')).toBe(1)
    expect(daysOverdue('2026-11-05', '2026-11-05')).toBe(0)
  })
})
