import { describe, expect, test } from 'bun:test'
import {
  addExtra,
  extraIssues,
  extraLineOf,
  extraTotalCents,
  extrasInput,
  missingExtraBoxes,
  removeExtra,
} from '#/modules/inventory/lib/reception-extras-draft'
import type { ExtrasDraft } from '#/modules/inventory/lib/reception-extras-draft'
import { missingExpiry } from '#/modules/inventory/lib/reception-draft'

/** Box of 6 at 0.5000 a piece, 0.0500 discount. */
const sample = extraLineOf({
  id: 'p1',
  name: 'Muestra',
  sku: 'ALP-3',
  supplierId: 's1',
  listPricePerPiece: 5000,
  fixedDiscountPerPiece: 500,
  promotionPerPiece: 0,
  presentations: [
    { factor: 1, active: true, isDefault: false },
    { factor: 6, active: true, isDefault: true },
  ],
})

const today = '2026-11-12'

describe('extraLineOf', () => {
  test('takes the default box and the catalog amounts', () => {
    expect(sample).toEqual({
      productId: 'p1',
      name: 'Muestra',
      sku: 'ALP-3',
      boxFactor: 6,
      price: {
        listPricePerPiece: 5000,
        fixedDiscountPerPiece: 500,
        promotionPerPiece: 0,
      },
    })
  })
})

describe('addExtra / removeExtra', () => {
  test('adds with one box, keeps typed values when added again, and removes', () => {
    const added = addExtra({}, 'p1')
    expect(added).toEqual({ p1: { boxes: '1', expiresOn: '' } })
    const typed: ExtrasDraft = { p1: { boxes: '4', expiresOn: '' } }
    expect(addExtra(typed, 'p1')).toBe(typed)
    expect(removeExtra(typed, 'p1')).toEqual({})
  })
})

describe('extraTotalCents', () => {
  test('is the net cost of the typed boxes at the typed price', () => {
    // 18 pieces × 0.5000 = 9.00 − 18 × 0.0500 = 0.90.
    expect(extraTotalCents(sample, { boxes: '3', expiresOn: '' })).toBe(810)
    // 18 × 0.6000 = 10.80 − 0.90.
    expect(
      extraTotalCents(sample, { boxes: '3', price: '0.6', expiresOn: '' }),
    ).toBe(990)
    expect(
      extraTotalCents(sample, { boxes: '3', price: 'x', expiresOn: '' }),
    ).toBeNull()
  })
})

describe('extraIssues', () => {
  test('asks for boxes, a valid price and an expiry, in that order', () => {
    const issues = (entry: ExtrasDraft[string]) =>
      extraIssues([sample], { p1: entry })
    expect(issues({ boxes: '0', expiresOn: '' })).toEqual({
      p1: missingExtraBoxes,
    })
    expect(issues({ boxes: 'x', expiresOn: '' }).p1).toBeDefined()
    expect(issues({ boxes: '1', price: '0.01', expiresOn: '' })).toEqual({
      p1: 'El descuento y la promoción no pueden superar el costo por pieza.',
    })
    expect(issues({ boxes: '1', expiresOn: '' })).toEqual({
      p1: missingExpiry,
    })
    expect(issues({ boxes: '1', expiresOn: '', noExpiry: true })).toEqual({})
  })
})

describe('extrasInput', () => {
  test('sends boxes, expiry and only a changed price', () => {
    expect(
      extrasInput(
        [sample],
        { p1: { boxes: '3', expiresOn: '2027-01-01', price: '0.5' } },
        today,
      ),
    ).toEqual({
      ok: true,
      value: {
        extras: [{ productId: 'p1', boxes: 3, expiresOn: '2027-01-01' }],
        expired: false,
        changed: 0,
      },
    })
    expect(
      extrasInput(
        [sample],
        { p1: { boxes: '2', noExpiry: true, expiresOn: '', price: '0.6' } },
        today,
      ),
    ).toEqual({
      ok: true,
      value: {
        extras: [
          {
            productId: 'p1',
            boxes: 2,
            noExpiry: true,
            listPricePerPiece: 6000,
          },
        ],
        expired: false,
        changed: 1,
      },
    })
  })

  test('flags an extra that enters expired and fails on an issue', () => {
    const expired = extrasInput(
      [sample],
      { p1: { boxes: '1', expiresOn: '2020-01-01' } },
      today,
    )
    expect(expired.ok && expired.value.expired).toBe(true)
    expect(
      extrasInput([sample], { p1: { boxes: '0', expiresOn: '' } }, today),
    ).toEqual({ ok: false, message: missingExtraBoxes })
  })
})
