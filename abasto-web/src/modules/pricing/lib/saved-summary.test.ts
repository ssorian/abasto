import { describe, expect, test } from 'bun:test'

import { savedSummary } from '#/modules/pricing/lib/saved-summary'

describe('savedSummary', () => {
  test('cost and prices together give one combined message', () => {
    expect(savedSummary(true, true, 3)).toBe('Costo y precios guardados.')
  })

  test('only cost, only one price, only several prices', () => {
    expect(savedSummary(true, false, 0)).toBe('Costo por pieza guardado.')
    expect(savedSummary(false, true, 1)).toBe('Precio guardado.')
    expect(savedSummary(false, true, 2)).toBe('Precios guardados.')
  })

  test('nothing saved gives no message', () => {
    expect(savedSummary(false, false, 0)).toBeNull()
  })
})
