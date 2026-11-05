import { describe, expect, test } from 'bun:test'
import {
  contactLine,
  creditSummary,
  formatOrderDate,
  presentationOptions,
  ruleLabel,
  termsLabel,
} from '#/modules/customers/lib/customer-labels'

const base = {
  contact: '',
  phone: '',
  creditEnabled: false,
  creditLimitCents: 0,
  termsDays: 0,
  active: true,
}

describe('customer labels', () => {
  test('cash customers and credit customers', () => {
    expect(termsLabel(base)).toBe('Contado')
    expect(
      termsLabel({
        ...base,
        creditEnabled: true,
        creditLimitCents: 150000,
        termsDays: 15,
      }),
    ).toBe('15 días · $1,500.00')
    expect(creditSummary(base)).toBe('Venta de contado · Activo')
    expect(
      creditSummary({
        ...base,
        active: false,
        creditEnabled: true,
        creditLimitCents: 5000,
        termsDays: 7,
      }),
    ).toBe('Crédito: $50.00 · 7 días · Inactivo')
  })

  test('contact line has fallbacks', () => {
    expect(contactLine(base)).toBe('Sin contacto · Sin teléfono')
    expect(contactLine({ ...base, contact: 'Ana', phone: '555' })).toBe(
      'Ana · 555',
    )
  })

  test('rule labels name the presentation, percent or price', () => {
    const names = new Map([['p1', 'Leche · Caja']])
    expect(
      ruleLabel(
        {
          presentationId: 'p1',
          minQuantity: 5,
          discountBps: 1250,
          priceCents: null,
        },
        names,
      ),
    ).toBe('Leche · Caja: 12.5% desde 5')
    expect(
      ruleLabel(
        {
          presentationId: 'p1',
          minQuantity: 1,
          discountBps: null,
          priceCents: 43850,
        },
        names,
      ),
    ).toBe('Leche · Caja: $438.50 desde 1')
    expect(
      ruleLabel(
        {
          presentationId: 'zz',
          minQuantity: 2,
          discountBps: 500,
          priceCents: null,
        },
        names,
      ),
    ).toBe('Presentación: 5% desde 2')
  })

  test('presentation options list active presentations only', () => {
    const options = presentationOptions([
      {
        name: 'Leche',
        presentations: [
          { id: 'a', name: 'Pieza', active: true },
          { id: 'b', name: 'Caja', active: false },
        ],
      },
      {
        name: 'Cola',
        presentations: [{ id: 'c', name: 'Caja', active: true }],
      },
    ])
    expect(options).toEqual([
      { id: 'a', label: 'Leche · Pieza' },
      { id: 'c', label: 'Cola · Caja' },
    ])
  })

  test('order dates use the business time zone', () => {
    // 2026-01-10 03:30 UTC is still the 9th in Mexico City (UTC-6).
    expect(formatOrderDate(new Date('2026-01-10T03:30:00Z'))).toContain('9')
    expect(formatOrderDate(new Date('2026-01-10T03:30:00Z'))).toContain('2026')
  })
})
