import { describe, expect, test } from 'bun:test'
import {
  riderNetLabel,
  riderShortfallSentence,
} from '#/modules/reports/lib/rider-shortfalls'
import type { RiderShortfallRow } from '#/modules/reports/types/reports'

const row = (overrides: Partial<RiderShortfallRow>): RiderShortfallRow => ({
  riderId: 'r',
  riderName: 'Luis',
  warehouseId: 'w',
  warehouseName: 'A',
  deliveries: 1,
  shortfallCents: 0,
  surplusCents: 0,
  netCents: 0,
  ...overrides,
})

describe('riderShortfallSentence', () => {
  test('says when nothing was short', () => {
    expect(riderShortfallSentence([])).toBe(
      'Ningún reparto liquidado tuvo faltante ni sobrante en el periodo.',
    )
  })

  test('states the net shortage with the number of deliveries', () => {
    expect(
      riderShortfallSentence([
        row({ deliveries: 2, shortfallCents: 4000, netCents: -4000 }),
        row({ surplusCents: 500, netCents: 500 }),
      ]),
    ).toBe(
      'En el periodo faltaron $35.00 en repartos; 3 repartos con diferencia.',
    )
  })

  test('states a net surplus', () => {
    expect(
      riderShortfallSentence([row({ surplusCents: 500, netCents: 500 })]),
    ).toBe(
      'En el periodo sobraron $5.00 en repartos; 1 reparto con diferencia.',
    )
  })
})

describe('riderNetLabel', () => {
  test('names the sign', () => {
    expect(riderNetLabel(-1)).toBe('Faltante')
    expect(riderNetLabel(1)).toBe('Sobrante')
    expect(riderNetLabel(0)).toBe('Compensado')
  })
})
