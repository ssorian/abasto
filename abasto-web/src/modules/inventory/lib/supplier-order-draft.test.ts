import { describe, expect, test } from 'bun:test'
import {
  MISSING_COST_MESSAGE,
  PRICE_BELOW_COST_MESSAGE,
  costPerBoxOf,
  orderInputFromDraft,
  orderTotalCents,
  rowWarnings,
  supplierProducts,
} from '#/modules/inventory/lib/supplier-order-draft'
import type {
  OrderDraft,
  OrderProduct,
} from '#/modules/inventory/lib/supplier-order-draft'

const presentations = (factor: number) => [
  { id: 'p', name: 'Caja', factor: 1, active: true, isDefault: false },
  { id: 'b', name: 'Caja', factor, active: true, isDefault: true },
]

/** Milk: 12 pieces at 22.0000 each → 264.00 per box. */
const milk: OrderProduct = {
  id: 'milk',
  name: 'Leche 1L',
  sku: 'LAL-001',
  supplierId: 's1',
  listPricePerPiece: 220000,
  fixedDiscountPerPiece: 0,
  promotionPerPiece: 0,
  presentations: presentations(12),
}
/** Yoghurt: 6 × (10.0000 − 1.0000 − 0.5000) = 51.00 per box. */
const yoghurt: OrderProduct = {
  ...milk,
  id: 'yog',
  name: 'Yoghurt',
  sku: 'LAL-005',
  listPricePerPiece: 100000,
  fixedDiscountPerPiece: 10000,
  promotionPerPiece: 5000,
  presentations: presentations(6),
}
const noCost: OrderProduct = {
  ...milk,
  id: 'cream',
  name: 'Crema',
  sku: 'LAL-009',
  listPricePerPiece: 0,
}
const other: OrderProduct = { ...milk, id: 'alp', supplierId: 's2' }

const draft = (boxes: OrderDraft['boxes']): OrderDraft => ({
  supplierId: 's1',
  warehouseId: 'w1',
  expectedOn: '2026-11-10',
  reference: ' P-1 ',
  boxes,
})

describe('costPerBoxOf', () => {
  test('is the net piece cost times pieces per box, in cents', () => {
    expect(costPerBoxOf(milk)).toBe(26400)
    expect(costPerBoxOf(yoghurt)).toBe(5100)
  })

  test('never goes negative', () => {
    expect(costPerBoxOf({ ...milk, fixedDiscountPerPiece: 999999 })).toBe(0)
  })
})

describe('rowWarnings', () => {
  test('warns when the cost per box exceeds the standard price', () => {
    expect(rowWarnings(milk, 25000)).toEqual([PRICE_BELOW_COST_MESSAGE])
  })

  test('warns when there is no standard price', () => {
    expect(rowWarnings(milk, undefined)).toEqual([PRICE_BELOW_COST_MESSAGE])
  })

  test('is quiet when the standard price covers the cost', () => {
    expect(rowWarnings(milk, 26400)).toEqual([])
    expect(rowWarnings(milk, 30000)).toEqual([])
  })

  test('flags products without supplier cost', () => {
    expect(rowWarnings(noCost, 30000)).toEqual([MISSING_COST_MESSAGE])
    expect(rowWarnings(noCost, undefined)).toEqual([
      MISSING_COST_MESSAGE,
      PRICE_BELOW_COST_MESSAGE,
    ])
  })
})

describe('supplierProducts', () => {
  const all = [milk, yoghurt, other]

  test('keeps only the supplier products', () => {
    expect(supplierProducts(all, 's1', '').map((p) => p.id)).toEqual([
      'milk',
      'yog',
    ])
    expect(supplierProducts(all, '', '')).toEqual([])
  })

  test('filters by name or SKU without accents or case', () => {
    expect(supplierProducts(all, 's1', 'LECHE').map((p) => p.id)).toEqual([
      'milk',
    ])
    expect(supplierProducts(all, 's1', 'lal-005').map((p) => p.id)).toEqual([
      'yog',
    ])
  })
})

describe('orderTotalCents', () => {
  test('adds boxes × cost per box of the supplier products', () => {
    expect(orderTotalCents([milk, yoghurt], { milk: '2', yog: '10' })).toBe(
      2 * 26400 + 10 * 5100,
    )
  })

  test('ignores blank, invalid and unknown rows', () => {
    expect(orderTotalCents([milk], { milk: 'x', ghost: '5' })).toBe(0)
  })
})

describe('orderInputFromDraft', () => {
  test('keeps rows with boxes and trims the reference', () => {
    const parsed = orderInputFromDraft(draft({ milk: '3', yog: '' }), [
      milk,
      yoghurt,
    ])
    expect(parsed).toEqual({
      ok: true,
      value: {
        supplierId: 's1',
        warehouseId: 'w1',
        expectedOn: '2026-11-10',
        reference: 'P-1',
        lines: [{ productId: 'milk', boxes: 3 }],
      },
    })
  })

  test('omits blank optional fields', () => {
    const parsed = orderInputFromDraft(
      { ...draft({ milk: '1' }), expectedOn: '', reference: '  ' },
      [milk],
    )
    expect(parsed).toEqual({
      ok: true,
      value: {
        supplierId: 's1',
        warehouseId: 'w1',
        lines: [{ productId: 'milk', boxes: 1 }],
      },
    })
  })

  test('never sends prices', () => {
    const parsed = orderInputFromDraft(draft({ milk: '1' }), [milk])
    expect(JSON.stringify(parsed)).not.toContain('Cents')
  })

  test('requires supplier, warehouse and at least one box', () => {
    expect(orderInputFromDraft({ ...draft({}), supplierId: '' }, []).ok).toBe(
      false,
    )
    expect(orderInputFromDraft({ ...draft({}), warehouseId: '' }, []).ok).toBe(
      false,
    )
    expect(orderInputFromDraft(draft({ milk: '0' }), [milk]).ok).toBe(false)
  })

  test('names the product with invalid boxes', () => {
    const parsed = orderInputFromDraft(draft({ milk: '1.5' }), [milk])
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.message).toContain('Leche 1L')
  })

  test('ignores boxes typed for products of another supplier', () => {
    const parsed = orderInputFromDraft(draft({ milk: '1', alp: '4' }), [
      milk,
      other,
    ])
    expect(parsed.ok && parsed.value.lines).toEqual([
      { productId: 'milk', boxes: 1 },
    ])
  })
})
