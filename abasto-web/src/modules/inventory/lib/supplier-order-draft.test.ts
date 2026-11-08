import { describe, expect, test } from 'bun:test'
import {
  NET_ABOVE_LIST_MESSAGE,
  PRICE_BELOW_COST_MESSAGE,
  costPerBoxOf,
  orderInputFromDraft,
  orderTotalCents,
  prefilledPrices,
  rowOf,
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

/** Milk: 12 pieces; no discount, so the list price is the cost. */
const milk: OrderProduct = {
  id: 'milk',
  name: 'Leche 1L',
  sku: 'LAL-001',
  supplierId: 's1',
  fixedDiscountPerPiece: 0,
  promotionPerPiece: 0,
  presentations: presentations(12),
}
/** Yoghurt: 6 pieces with 1.0000 discount and 0.5000 promotion on the product. */
const yoghurt: OrderProduct = {
  ...milk,
  id: 'yog',
  name: 'Yoghurt',
  sku: 'LAL-005',
  fixedDiscountPerPiece: 10000,
  promotionPerPiece: 5000,
  presentations: presentations(6),
}
const other: OrderProduct = { ...milk, id: 'alp', supplierId: 's2' }

const draft = (
  boxes: OrderDraft['boxes'],
  prices: OrderDraft['prices'] = {},
): OrderDraft => ({
  supplierId: 's1',
  warehouseId: 'w1',
  expectedOn: '2026-11-10',
  reference: ' P-1 ',
  boxes,
  prices,
})

describe('costPerBoxOf', () => {
  test('is the net piece cost times pieces per box, in cents', () => {
    // 12 × 22.0000 = 264.00
    expect(costPerBoxOf(milk, 220000)).toBe(26400)
    // 6 × (10.0000 − 1.0000 − 0.5000) = 51.00
    expect(costPerBoxOf(yoghurt, 100000)).toBe(5100)
  })

  test('rounds half up to cents', () => {
    // 6 × 0.0025 = 0.0150 → 1.5 cents → 2
    expect(costPerBoxOf({ ...milk, presentations: presentations(6) }, 25)).toBe(
      2,
    )
  })

  test('never goes negative', () => {
    expect(costPerBoxOf(yoghurt, 5000)).toBe(0)
  })
})

describe('rowOf', () => {
  test('reads the typed boxes and list price of one product', () => {
    expect(rowOf(milk, '3', '22.0000')).toEqual({
      boxes: 3,
      listPrice: 220000,
      costPerBoxCents: 26400,
      totalCents: 79200,
    })
  })

  test('unparsable or blank fields count as zero', () => {
    expect(rowOf(milk, 'x', '22')).toMatchObject({ boxes: 0, totalCents: 0 })
    expect(rowOf(milk, '2', '')).toMatchObject({
      listPrice: 0,
      costPerBoxCents: 0,
      totalCents: 0,
    })
    expect(rowOf(milk, '2', '1,5')).toMatchObject({ listPrice: 0 })
  })
})

describe('rowWarnings', () => {
  const row = (boxes: number, costPerBoxCents: number) => ({
    boxes,
    costPerBoxCents,
  })

  test('warns when the cost per box exceeds the standard price', () => {
    expect(rowWarnings(row(2, 25001), 25000)).toEqual([
      PRICE_BELOW_COST_MESSAGE,
    ])
  })

  test('warns when there is no standard price', () => {
    expect(rowWarnings(row(1, 100), undefined)).toEqual([
      PRICE_BELOW_COST_MESSAGE,
    ])
  })

  test('is quiet when the standard price covers the cost', () => {
    expect(rowWarnings(row(1, 26400), 26400)).toEqual([])
    expect(rowWarnings(row(1, 26400), 30000)).toEqual([])
  })

  test('is quiet on rows without boxes', () => {
    expect(rowWarnings(row(0, 99999), 100)).toEqual([])
    expect(rowWarnings(row(0, 99999), undefined)).toEqual([])
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
    expect(
      orderTotalCents(
        [milk, yoghurt],
        draft({ milk: '2', yog: '10' }, { milk: '22', yog: '10' }),
      ),
    ).toBe(2 * 26400 + 10 * 5100)
  })

  test('ignores blank, invalid and unknown rows', () => {
    expect(
      orderTotalCents([milk], draft({ milk: 'x', ghost: '5' }, { milk: '22' })),
    ).toBe(0)
  })
})

describe('prefilledPrices', () => {
  test('shows the last list price per product with 4 decimals', () => {
    expect(
      prefilledPrices([
        { productId: 'milk', listPricePerPiece: 12055 },
        { productId: 'yog', listPricePerPiece: 840 },
      ]),
    ).toEqual({ milk: '1.2055', yog: '0.0840' })
  })

  test('has nothing to prefill without previous orders', () => {
    expect(prefilledPrices([])).toEqual({})
  })
})

describe('orderInputFromDraft', () => {
  test('keeps rows with boxes, their list price, and trims the reference', () => {
    const parsed = orderInputFromDraft(
      draft({ milk: '3', yog: '' }, { milk: '22.0000', yog: '9' }),
      [milk, yoghurt],
    )
    expect(parsed).toEqual({
      ok: true,
      value: {
        supplierId: 's1',
        warehouseId: 'w1',
        expectedOn: '2026-11-10',
        reference: 'P-1',
        lines: [{ productId: 'milk', boxes: 3, listPricePerPiece: 220000 }],
      },
    })
  })

  test('omits blank optional fields and sends a blank price as zero', () => {
    const parsed = orderInputFromDraft(
      { ...draft({ milk: '1' }), expectedOn: '', reference: '  ' },
      [milk],
    )
    expect(parsed).toEqual({
      ok: true,
      value: {
        supplierId: 's1',
        warehouseId: 'w1',
        lines: [{ productId: 'milk', boxes: 1, listPricePerPiece: 0 }],
      },
    })
  })

  test('never sends discounts, promotions or totals: the server takes them from the catalog', () => {
    const parsed = orderInputFromDraft(draft({ yog: '1' }, { yog: '10' }), [
      yoghurt,
    ])
    const json = JSON.stringify(parsed)
    expect(json).not.toContain('Discount')
    expect(json).not.toContain('promotion')
    expect(json).not.toContain('Cents')
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

  test('names the product with invalid boxes or price', () => {
    const boxes = orderInputFromDraft(draft({ milk: '1.5' }), [milk])
    expect(boxes.ok).toBe(false)
    if (!boxes.ok) expect(boxes.message).toContain('Leche 1L')
    const price = orderInputFromDraft(
      draft({ milk: '1' }, { milk: '1.23456' }),
      [milk],
    )
    expect(price).toEqual({
      ok: false,
      message: 'Leche 1L: Usa máximo 4 decimales.',
    })
  })

  test('rejects discount plus promotion above the typed list price', () => {
    const parsed = orderInputFromDraft(draft({ yog: '1' }, { yog: '1.4999' }), [
      yoghurt,
    ])
    expect(parsed).toEqual({
      ok: false,
      message: `Yoghurt: ${NET_ABOVE_LIST_MESSAGE}`,
    })
    expect(
      orderInputFromDraft(draft({ yog: '1' }, { yog: '1.5' }), [yoghurt]).ok,
    ).toBe(true)
  })

  test('ignores rows without boxes even when their price is wrong', () => {
    const parsed = orderInputFromDraft(
      draft({ milk: '1', yog: '0' }, { milk: '22', yog: 'abc' }),
      [milk, yoghurt],
    )
    expect(parsed.ok && parsed.value.lines).toEqual([
      { productId: 'milk', boxes: 1, listPricePerPiece: 220000 },
    ])
  })

  test('ignores boxes typed for products of another supplier', () => {
    const parsed = orderInputFromDraft(draft({ milk: '1', alp: '4' }), [
      milk,
      other,
    ])
    expect(parsed.ok && parsed.value.lines).toEqual([
      { productId: 'milk', boxes: 1, listPricePerPiece: 0 },
    ])
  })
})
