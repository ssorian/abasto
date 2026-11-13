import { describe, expect, test } from 'bun:test'
import {
  contactLine,
  formatOrderDate,
  pickerItems,
  presentationOptions,
  ruleLabel,
  rulesSummary,
  statusLabel,
} from '#/modules/customers/lib/customer-labels'

const base = {
  contact: '',
  phone: '',
  active: true,
}

describe('customer labels', () => {
  test('status label', () => {
    expect(statusLabel(base)).toBe('Activo')
    expect(statusLabel({ ...base, active: false })).toBe('Inactivo')
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

describe('rules help and presentation picker items', () => {
  test('empty rules read as list price', () => {
    expect(rulesSummary(0)).toBe('Sin condiciones: compra a precio de lista.')
    expect(rulesSummary(2)).toBeNull()
  })

  test('presentation options become picker items searchable by SKU', () => {
    expect(
      pickerItems([
        { id: 'p1', label: 'Leche · Caja', sku: 'LEC-1' },
        { id: 'p2', label: 'Arroz · Bulto' },
      ]),
    ).toEqual([
      { id: 'p1', name: 'Leche · Caja', sku: 'LEC-1' },
      { id: 'p2', name: 'Arroz · Bulto', sku: '' },
    ])
  })
})
