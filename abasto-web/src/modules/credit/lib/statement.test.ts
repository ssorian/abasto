import { describe, expect, test } from 'bun:test'
import {
  centsToPesosText,
  dueLabel,
  sortReceivables,
  statementRows,
} from '#/modules/credit/lib/statement'

const at = (iso: string) => new Date(iso)

describe('statementRows', () => {
  test('labels charges and abonos with signed amounts and the running balance', () => {
    const rows = statementRows([
      {
        id: 'e1',
        type: 'charge',
        amountCents: 8000,
        dueOn: '2026-11-11',
        orderId: 'abcdef1234',
        balanceCents: 8000,
        createdAt: at('2026-11-04T18:00:00Z'),
      },
      {
        id: 'e2',
        type: 'abono',
        amountCents: 3000,
        dueOn: null,
        orderId: null,
        balanceCents: 5000,
        createdAt: at('2026-11-05T18:00:00Z'),
      },
    ])
    expect(rows).toEqual([
      {
        id: 'e1',
        label: 'Cargo · PED-ABCDEF12',
        amount: '$80.00',
        kind: 'charge',
        due: 'Vence 11 nov 2026',
        balance: '$80.00',
        date: at('2026-11-04T18:00:00Z'),
      },
      {
        id: 'e2',
        label: 'Abono',
        amount: '-$30.00',
        kind: 'abono',
        due: '',
        balance: '$50.00',
        date: at('2026-11-05T18:00:00Z'),
      },
    ])
  })

  test('shows newest first when asked', () => {
    const base = {
      type: 'abono' as const,
      amountCents: 1,
      dueOn: null,
      orderId: null,
      balanceCents: 0,
    }
    const rows = statementRows(
      [
        { ...base, id: 'a', createdAt: at('2026-01-01T00:00:00Z') },
        { ...base, id: 'b', createdAt: at('2026-01-02T00:00:00Z') },
      ],
      { newestFirst: true },
    )
    expect(rows.map((row) => row.id)).toEqual(['b', 'a'])
  })
})

describe('dueLabel', () => {
  test('formats the calendar day without time zone drift', () => {
    expect(dueLabel('2026-01-01')).toBe('1 ene 2026')
    expect(dueLabel('2026-12-31')).toBe('31 dic 2026')
  })
})

describe('sortReceivables', () => {
  const row = (name: string, balanceCents: number, overdueCents: number) => ({
    customerId: name,
    name,
    balanceCents,
    overdueCents,
  })

  test('keeps only customers with a balance, overdue first then larger balance', () => {
    const sorted = sortReceivables([
      row('Cero', 0, 0),
      row('Grande', 9000, 0),
      row('Vencido', 1000, 500),
      row('Mediano', 4000, 0),
    ])
    expect(sorted.map((r) => r.name)).toEqual(['Vencido', 'Grande', 'Mediano'])
  })
})

describe('centsToPesosText', () => {
  test('writes whole cents as pesos with digits only', () => {
    expect(centsToPesosText(0)).toBe('0.00')
    expect(centsToPesosText(5)).toBe('0.05')
    expect(centsToPesosText(150050)).toBe('1500.50')
    expect(centsToPesosText(2147483647)).toBe('21474836.47')
  })
})
