import { describe, expect, test } from 'bun:test'
import { returnInputFromDraft } from '#/modules/inventory/lib/pending-return'

const base = { pendingId: 'p1', owedBoxes: 4 }

describe('returnInputFromDraft', () => {
  test('replacement carries no amount', () => {
    expect(
      returnInputFromDraft({
        ...base,
        boxes: '2',
        resolution: 'replacement',
        credit: '99',
      }),
    ).toEqual({
      ok: true,
      value: { pendingId: 'p1', boxes: 2, resolution: 'replacement' },
    })
  })

  test('discount with a typed amount sends it in cents', () => {
    expect(
      returnInputFromDraft({
        ...base,
        boxes: '4',
        resolution: 'discount',
        credit: '438.50',
      }),
    ).toEqual({
      ok: true,
      value: {
        pendingId: 'p1',
        boxes: 4,
        resolution: 'discount',
        creditCents: 43_850,
      },
    })
  })

  test('discount with a blank amount leaves it to the original value', () => {
    expect(
      returnInputFromDraft({
        ...base,
        boxes: '1',
        resolution: 'discount',
        credit: '',
      }),
    ).toEqual({
      ok: true,
      value: { pendingId: 'p1', boxes: 1, resolution: 'discount' },
    })
  })

  test('accepts a zero amount', () => {
    const parsed = returnInputFromDraft({
      ...base,
      boxes: '1',
      resolution: 'discount',
      credit: '0',
    })
    expect(parsed.ok && parsed.value.creditCents).toBe(0)
  })

  test('rejects zero boxes, too many boxes and bad numbers', () => {
    const rejected = (boxes: string, credit = '') => {
      const parsed = returnInputFromDraft({
        ...base,
        boxes,
        resolution: 'discount',
        credit,
      })
      return parsed.ok ? null : parsed.message
    }
    expect(rejected('0')).toBe('Escribe cuántas cajas devolver.')
    expect(rejected('')).toBe('Escribe cuántas cajas devolver.')
    expect(rejected('5')).toBe('El proveedor tiene 4 cajas por devolver.')
    expect(rejected('1.5')).toBe('Escribe un número entero de cajas.')
    expect(rejected('1', '1,5')).toBe(
      'Usa punto para los decimales, sin comas.',
    )
  })
})
