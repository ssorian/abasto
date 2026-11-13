import { describe, expect, test } from 'bun:test'
import { removalPrefill } from '#/modules/inventory/lib/removal-prefill'

describe('removalPrefill', () => {
  test('fills the whole expired lot for the vencido reason', () => {
    expect(
      removalPrefill({
        reason: 'caducado',
        expired: true,
        onHand: 30,
        factor: 12,
      }),
    ).toEqual({ packs: '2', loose: '6' })
  })
  test('leaves loose empty when the lot is whole packs', () => {
    expect(
      removalPrefill({
        reason: 'caducado',
        expired: true,
        onHand: 24,
        factor: 12,
      }),
    ).toEqual({ packs: '2', loose: '' })
  })
  test('uses loose units for a single-unit presentation', () => {
    expect(
      removalPrefill({
        reason: 'caducado',
        expired: true,
        onHand: 5,
        factor: 1,
      }),
    ).toEqual({ packs: '', loose: '5' })
  })
  test('does not prefill a lot that is not expired', () => {
    expect(
      removalPrefill({
        reason: 'caducado',
        expired: false,
        onHand: 5,
        factor: 1,
      }),
    ).toBeNull()
  })
  test('does not prefill other reasons', () => {
    expect(
      removalPrefill({ reason: 'dañado', expired: true, onHand: 5, factor: 1 }),
    ).toBeNull()
  })
})
