import { describe, expect, test } from 'bun:test'
import {
  countInputFromDraft,
  countDifference,
  minimumInputFromDraft,
  additionInputFromDraft,
  removalInputFromDraft,
  typedCount,
} from '#/modules/inventory/lib/stock-drafts'

const qty = { packs: '2', loose: '3', factor: 12 }

describe('countInputFromDraft and countDifference', () => {
  test('accepts an explicit zero and trims the note', () => {
    for (const typed of [
      { packs: '', loose: '0' },
      { packs: '0', loose: '' },
    ]) {
      expect(
        countInputFromDraft({
          productId: 'p1',
          warehouseId: 'w1',
          ...typed,
          factor: 12,
          note: ' vacío ',
        }),
      ).toEqual({
        ok: true,
        value: {
          productId: 'p1',
          warehouseId: 'w1',
          countedQuantity: 0,
          note: 'vacío',
        },
      })
    }
  })

  test('an empty quantity is not a count: it asks for a number', () => {
    const message = 'Escribe la cantidad contada. Si no queda nada, escribe 0.'
    for (const typed of [
      { packs: '', loose: '' },
      { packs: '  ', loose: ' ' },
    ]) {
      expect(
        countInputFromDraft({
          productId: 'p1',
          warehouseId: 'w1',
          ...typed,
          factor: 12,
          note: '',
        }),
      ).toEqual({ ok: false, message })
    }
  })

  test('typedCount is only a number once something was typed', () => {
    expect(typedCount({ packs: '', loose: '', factor: 12 })).toBeNull()
    expect(typedCount({ packs: '', loose: '0', factor: 12 })).toBe(0)
    expect(typedCount({ packs: '2', loose: '', factor: 12 })).toBe(24)
    expect(typedCount({ packs: 'x', loose: '', factor: 12 })).toBeNull()
  })

  test('selecting a product is required', () => {
    expect(
      countInputFromDraft({
        productId: '',
        warehouseId: 'w1',
        ...qty,
        note: '',
      }),
    ).toEqual({ ok: false, message: 'Selecciona el producto.' })
  })

  test('difference is counted minus expected', () => {
    expect(countDifference(30, 27)).toBe(-3)
    expect(countDifference(0, 5)).toBe(5)
  })
})

describe('minimumInputFromDraft', () => {
  test('accepts zero (no minimum)', () => {
    expect(
      minimumInputFromDraft({
        productId: 'p1',
        warehouseId: 'w1',
        packs: '',
        loose: '0',
        factor: 12,
      }),
    ).toEqual({
      ok: true,
      value: { productId: 'p1', warehouseId: 'w1', minimum: 0 },
    })
    expect(
      minimumInputFromDraft({ productId: 'p1', warehouseId: 'w1', ...qty }),
    ).toEqual({
      ok: true,
      value: { productId: 'p1', warehouseId: 'w1', minimum: 27 },
    })
  })
})

describe('removalInputFromDraft (Quitar existencias)', () => {
  const base = { lotId: 'l1', ...qty }

  test('expired or damaged is a loss with its category', () => {
    for (const reason of ['caducado', 'dañado'] as const) {
      expect(
        removalInputFromDraft({
          ...base,
          reason,
          detail: ' Se cayó ',
        }),
      ).toEqual({
        ok: true,
        value: {
          kind: 'loss',
          input: {
            lotId: 'l1',
            quantity: 27,
            category: reason,
            reason: 'Se cayó',
          },
        },
      })
    }
  })

  test('another reason is a negative adjustment', () => {
    expect(
      removalInputFromDraft({ ...base, reason: 'otro', detail: 'Muestra' }),
    ).toEqual({
      ok: true,
      value: {
        kind: 'adjustment',
        input: { lotId: 'l1', quantity: -27, reason: 'Muestra' },
      },
    })
  })

  test('asks for a detail and a quantity', () => {
    expect(
      removalInputFromDraft({ ...base, reason: 'otro', detail: ' ' }),
    ).toEqual({ ok: false, message: 'Escribe qué pasó con las existencias.' })
    expect(
      removalInputFromDraft({
        ...base,
        packs: '',
        loose: '',
        reason: 'dañado',
        detail: 'x',
      }).ok,
    ).toBe(false)
  })
})

describe('additionInputFromDraft (Sumar existencias)', () => {
  const base = { lotId: 'l1', ...qty }

  test('is a positive adjustment with its reason', () => {
    expect(
      additionInputFromDraft({ ...base, detail: ' Llegó una caja de más ' }),
    ).toEqual({
      ok: true,
      value: { lotId: 'l1', quantity: 27, reason: 'Llegó una caja de más' },
    })
  })

  test('asks for a detail and a quantity', () => {
    expect(additionInputFromDraft({ ...base, detail: ' ' })).toEqual({
      ok: false,
      message: 'Escribe por qué sumas existencias.',
    })
    expect(
      additionInputFromDraft({ ...base, packs: '', loose: '', detail: 'x' }).ok,
    ).toBe(false)
  })
})
