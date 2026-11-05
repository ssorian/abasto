import { describe, expect, test } from 'bun:test'
import {
  initialPriceTexts,
  pricesFromSelection,
  uniqueByPresentation,
} from '#/modules/inventory/lib/price-suggestions'
import type { PriceSuggestion } from '#/modules/pricing/services/price-suggestions'

function suggestion(
  lotId: string,
  presentationId: string,
  suggestedPriceCents: number,
): PriceSuggestion {
  return {
    lotId,
    productId: 'p',
    productName: 'Leche',
    presentationId,
    presentationName: 'cajas',
    marginBps: 1000,
    currentPriceCents: null,
    suggestedPriceCents,
  }
}

describe('price suggestions', () => {
  test('keeps the latest suggestion per presentation', () => {
    const list = [
      suggestion('l1', 'x', 100),
      suggestion('l2', 'y', 200),
      suggestion('l3', 'x', 150),
    ]
    expect(uniqueByPresentation(list).map((item) => item.lotId)).toEqual([
      'l2',
      'l3',
    ])
  })

  test('prefills prices in pesos with two decimals', () => {
    expect(
      initialPriceTexts([
        suggestion('l1', 'x', 43850),
        suggestion('l2', 'y', 7),
      ]),
    ).toEqual({
      x: '438.50',
      y: '0.07',
    })
  })

  test('builds the apply payload from the checked rows only', () => {
    const list = [suggestion('l1', 'x', 100), suggestion('l2', 'y', 200)]
    expect(
      pricesFromSelection(list, { x: '1.25', y: '2.00' }, new Set(['x'])),
    ).toEqual({ ok: true, value: [{ presentationId: 'x', priceCents: 125 }] })
  })

  test('rejects invalid typed prices and an empty selection', () => {
    const list = [suggestion('l1', 'x', 100)]
    expect(pricesFromSelection(list, { x: '1.234' }, new Set(['x']))).toEqual({
      ok: false,
      message: 'Usa máximo 2 decimales.',
    })
    expect(pricesFromSelection(list, { x: '1' }, new Set())).toEqual({
      ok: false,
      message: 'Elige al menos un precio para aplicar.',
    })
  })
})
