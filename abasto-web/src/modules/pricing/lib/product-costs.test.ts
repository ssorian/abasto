import { describe, expect, test } from 'bun:test'

import {
  costPatchIfChanged,
  formatPieceCost,
  netCostOf,
  saleCheck,
} from '#/modules/pricing/lib/product-costs'

const stored = {
  listPricePerPiece: 20000,
  fixedDiscountPerPiece: 1000,
  promotionPerPiece: 500,
}

describe('net cost of a draft', () => {
  test('derives net per piece and per box from the typed amounts', () => {
    const draft = { listPrice: '2', fixedDiscount: '0.1', promotion: '0.05' }
    expect(netCostOf(draft, 12)).toEqual({
      perPiece: 18500,
      perBoxCents: 2220,
    })
  })

  test('is null while an amount is invalid or discounts exceed the price', () => {
    expect(
      netCostOf({ listPrice: 'x', fixedDiscount: '', promotion: '' }, 12),
    ).toBeNull()
    expect(
      netCostOf({ listPrice: '1', fixedDiscount: '0.8', promotion: '0.3' }, 1),
    ).toBeNull()
  })
})

describe('cost patch if changed', () => {
  test('is null when the typed amounts equal the stored ones', () => {
    const draft = { listPrice: '2.0000', fixedDiscount: '0.1', promotion: '' }
    expect(
      costPatchIfChanged(draft, { ...stored, promotionPerPiece: 0 }),
    ).toEqual({ ok: true, value: null })
  })

  test('returns the three amounts when one changed', () => {
    const draft = { listPrice: '2.5', fixedDiscount: '0.1', promotion: '0.05' }
    expect(costPatchIfChanged(draft, stored)).toEqual({
      ok: true,
      value: {
        listPricePerPiece: 25000,
        fixedDiscountPerPiece: 1000,
        promotionPerPiece: 500,
      },
    })
  })

  test('reports the first error', () => {
    const draft = { listPrice: '1', fixedDiscount: '0.8', promotion: '0.3' }
    expect(costPatchIfChanged(draft, stored).ok).toBe(false)
  })
})

describe('sale check', () => {
  test('margin is the share of the sale price above the cost', () => {
    // 18500 ten-thousandths × 12 = 22.20 per box
    expect(saleCheck(12, 3000, 18500)).toEqual({
      costCents: 2220,
      marginBps: 2600,
      belowCost: false,
    })
  })

  test('selling below the net cost is flagged with a negative margin', () => {
    const check = saleCheck(12, 2000, 18500)
    expect(check?.belowCost).toBe(true)
    expect(check?.marginBps).toBe(-1100)
  })

  test('selling at cost is not below cost', () => {
    expect(saleCheck(12, 2220, 18500)?.belowCost).toBe(false)
  })

  test('has no check without a price or without a cost', () => {
    expect(saleCheck(12, null, 18500)).toBeNull()
    expect(saleCheck(12, 3000, 0)).toBeNull()
  })
})

describe('format piece cost', () => {
  test('shows pesos with 2 decimals, rounding half up', () => {
    expect(formatPieceCost(18500)).toBe('$1.85')
    expect(formatPieceCost(12055)).toBe('$1.21')
  })
})
