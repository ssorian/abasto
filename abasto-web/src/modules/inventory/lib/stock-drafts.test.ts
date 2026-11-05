import { describe, expect, test } from 'bun:test'
import {
  adjustInputFromDraft,
  countInputFromDraft,
  countDifference,
  lossInputFromDraft,
  minimumInputFromDraft,
} from '#/modules/inventory/lib/stock-drafts'

const qty = { packs: '2', loose: '3', factor: 12 }

describe('adjustInputFromDraft', () => {
  test('adds positive and removes negative base units', () => {
    expect(
      adjustInputFromDraft({
        lotId: 'l1',
        direction: 'add',
        ...qty,
        reason: ' Sobrante ',
      }),
    ).toEqual({
      ok: true,
      value: { lotId: 'l1', quantity: 27, reason: 'Sobrante' },
    })
    expect(
      adjustInputFromDraft({
        lotId: 'l1',
        direction: 'remove',
        ...qty,
        reason: 'Merma',
      }),
    ).toEqual({
      ok: true,
      value: { lotId: 'l1', quantity: -27, reason: 'Merma' },
    })
  })

  test('requires a reason and a quantity', () => {
    expect(
      adjustInputFromDraft({
        lotId: 'l1',
        direction: 'add',
        ...qty,
        reason: ' ',
      }),
    ).toEqual({ ok: false, message: 'Escribe el motivo del ajuste.' })
    expect(
      adjustInputFromDraft({
        lotId: 'l1',
        direction: 'add',
        packs: '',
        loose: '',
        factor: 12,
        reason: 'x',
      }).ok,
    ).toBe(false)
  })
})

describe('lossInputFromDraft', () => {
  test('keeps the quantity positive and the category', () => {
    expect(
      lossInputFromDraft({
        lotId: 'l1',
        category: 'dañado',
        ...qty,
        reason: 'Se cayó la tarima',
      }),
    ).toEqual({
      ok: true,
      value: {
        lotId: 'l1',
        quantity: 27,
        category: 'dañado',
        reason: 'Se cayó la tarima',
      },
    })
  })

  test('requires a reason', () => {
    expect(
      lossInputFromDraft({ lotId: 'l1', category: 'otro', ...qty, reason: '' }),
    ).toEqual({ ok: false, message: 'Escribe el motivo de la pérdida.' })
  })
})

describe('countInputFromDraft and countDifference', () => {
  test('accepts zero and trims the note', () => {
    expect(
      countInputFromDraft({
        productId: 'p1',
        warehouseId: 'w1',
        packs: '',
        loose: '',
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
