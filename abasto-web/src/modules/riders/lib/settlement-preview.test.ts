import { describe, expect, test } from 'bun:test'

import { previewSettlement } from './settlement-preview'
import type { PreviewLine } from './settlement-preview'

// 30 units in two lots, oldest first: 20 at 1000/1 and 10 at 1200/1.
const line = (over: Partial<PreviewLine> = {}): PreviewLine => ({
  assignedQuantity: 30,
  boxFactor: 12,
  allocations: [
    { quantity: 20, priceCents: 1000, priceFactor: 1 },
    { quantity: 10, priceCents: 1200, priceFactor: 1 },
  ],
  boxes: '0',
  units: '0',
  ...over,
})

describe('previewSettlement', () => {
  test('sells everything when nothing comes back', () => {
    const preview = previewSettlement([line()], '320')
    expect(preview.lines[0]).toMatchObject({ leftover: 0, sold: 30 })
    expect(preview.expectedCents).toBe(20 * 1000 + 10 * 1200)
    expect(preview.deliveredCents).toBe(32000)
    expect(preview.differenceCents).toBe(0)
    expect(preview.kind).toBe('exact')
    expect(preview.valid).toBe(true)
  })

  test('leftover comes out of the newest allocations first, like the server', () => {
    // 1 box (12) + 2 units back = 14 left over; 16 sold from the oldest lot.
    const preview = previewSettlement([line({ boxes: '1', units: '2' })], '160')
    expect(preview.lines[0]).toMatchObject({ leftover: 14, sold: 16 })
    expect(preview.expectedCents).toBe(16 * 1000)
    expect(preview.kind).toBe('exact')
  })

  test('reports a shortage when less cash arrives', () => {
    const preview = previewSettlement([line()], '300')
    expect(preview.differenceCents).toBe(30000 - 32000)
    expect(preview.kind).toBe('shortage')
  })

  test('reports a surplus when more cash arrives', () => {
    const preview = previewSettlement([line()], '325.50')
    expect(preview.differenceCents).toBe(32550 - 32000)
    expect(preview.kind).toBe('surplus')
  })

  test('prices a presentation of several units with the frozen factor', () => {
    const preview = previewSettlement(
      [
        line({
          assignedQuantity: 12,
          allocations: [{ quantity: 12, priceCents: 1999, priceFactor: 12 }],
          boxes: '0',
          units: '5',
        }),
      ],
      '0',
    )
    // 7 sold × 1999 / 12 = 1166.08 → 1166
    expect(preview.expectedCents).toBe(1166)
  })

  test('refuses a leftover above what was assigned', () => {
    const preview = previewSettlement([line({ boxes: '3' })], '0')
    expect(preview.lines[0].error).toBe(
      'No puede regresar más de lo que se asignó.',
    )
    expect(preview.valid).toBe(false)
  })

  test('refuses non-integer or negative quantities', () => {
    for (const bad of ['1.5', '-1', 'x']) {
      const preview = previewSettlement([line({ units: bad })], '0')
      expect(preview.lines[0].error).toBe(
        'Escribe un número entero, cero o más.',
      )
      expect(preview.valid).toBe(false)
    }
  })

  test('blank quantities count as zero; blank cash is not valid yet', () => {
    const preview = previewSettlement([line({ boxes: '', units: '' })], '')
    expect(preview.lines[0].leftover).toBe(0)
    expect(preview.deliveredCents).toBeNull()
    expect(preview.differenceCents).toBeNull()
    expect(preview.valid).toBe(false)
  })

  test('accepts zero delivered cash and refuses negative or malformed cash', () => {
    const none = previewSettlement([line({ boxes: '', units: '30' })], '0')
    expect(none.expectedCents).toBe(0)
    expect(none.deliveredCents).toBe(0)
    expect(none.valid).toBe(true)
    const negative = previewSettlement([line()], '-5')
    expect(negative.deliveredCents).toBeNull()
    expect(negative.deliveredError).toBe('El monto no puede ser negativo.')
    expect(previewSettlement([line()], '1,5').valid).toBe(false)
  })
})
