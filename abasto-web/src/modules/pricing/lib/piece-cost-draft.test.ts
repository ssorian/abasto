import { describe, expect, test } from 'bun:test'

import {
  pieceCostDraftOf,
  pieceCostErrors,
  pieceCostPatchOf,
} from '#/modules/pricing/lib/piece-cost-draft'
import { ABOVE_LIST_PRICE_MESSAGE } from '#/modules/catalog/lib/product-draft'

const stored = {
  listPricePerPiece: 12055,
  fixedDiscountPerPiece: 1000,
  promotionPerPiece: 500,
}

describe('piece cost draft', () => {
  test('starts from the stored amounts with four decimals', () => {
    expect(pieceCostDraftOf(stored)).toEqual({
      listPrice: '1.2055',
      fixedDiscount: '0.1000',
      promotion: '0.0500',
    })
  })

  test('a valid draft saves a patch with only the three amounts', () => {
    const draft = { listPrice: '2.5', fixedDiscount: '0.25', promotion: '0' }
    expect(pieceCostErrors(draft)).toEqual({})
    expect(pieceCostPatchOf(draft)).toEqual({
      ok: true,
      value: {
        listPricePerPiece: 25000,
        fixedDiscountPerPiece: 2500,
        promotionPerPiece: 0,
      },
    })
  })

  test('unparsable amounts report an error per field and no patch', () => {
    const draft = { listPrice: 'abc', fixedDiscount: '1.23456', promotion: '' }
    const errors = pieceCostErrors(draft)
    expect(errors.listPrice).toBeString()
    expect(errors.fixedDiscount).toBeString()
    const patch = pieceCostPatchOf(draft)
    expect(patch.ok).toBe(false)
  })

  test('discount plus promotion above the price is rejected', () => {
    const draft = { listPrice: '1', fixedDiscount: '0.8', promotion: '0.3' }
    expect(pieceCostErrors(draft)).toEqual({
      fixedDiscount: ABOVE_LIST_PRICE_MESSAGE,
    })
    expect(pieceCostPatchOf(draft)).toEqual({
      ok: false,
      message: ABOVE_LIST_PRICE_MESSAGE,
    })
  })

  test('discount plus promotion equal to the price is allowed', () => {
    const draft = { listPrice: '1', fixedDiscount: '0.7', promotion: '0.3' }
    expect(pieceCostPatchOf(draft).ok).toBe(true)
  })
})
