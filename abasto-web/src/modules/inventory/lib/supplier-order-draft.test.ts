import { describe, expect, test } from 'bun:test'
import {
  NET_ABOVE_GROSS_MESSAGE,
  PRICE_BELOW_COST_MESSAGE,
  boxFactorOf,
  orderInputFromDraft,
  orderTotalCents,
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

/** Milk: 12 pieces; no discount. */
const milk: OrderProduct = {
  id: 'milk',
  name: 'Leche 1L',
  sku: 'LAL-001',
  supplierId: 's1',
  fixedDiscountPerPiece: 0,
  promotionPerPiece: 0,
  presentations: presentations(12),
}
/** Yoghurt: 6 pieces with 1.0000 discount and 0.5000 promotion per piece on the product. */
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
  costs: OrderDraft['costs'] = {},
): OrderDraft => ({
  supplierId: 's1',
  warehouseId: 'w1',
  expectedOn: '2026-11-10',
  reference: ' P-1 ',
  boxes,
  costs,
})

describe('boxFactorOf', () => {
  test('is the default presentation, active or not, like the server', () => {
    expect(boxFactorOf(milk)).toBe(12)
    expect(
      boxFactorOf({
        ...milk,
        presentations: [
          { factor: 1, active: true, isDefault: false },
          { factor: 12, active: false, isDefault: true },
        ],
      }),
    ).toBe(12)
  })

  test('is 1 without a default presentation', () => {
    expect(boxFactorOf({ ...milk, presentations: [] })).toBe(1)
    expect(
      boxFactorOf({
        ...milk,
        presentations: [{ factor: 12, active: true, isDefault: false }],
      }),
    ).toBe(1)
  })
})

describe('rowOf', () => {
  test('breaks the typed gross cost down like the server', () => {
    // 2 boxes × 12 = 24 pieces; gross 144.00; 24 × 0 discount.
    expect(rowOf(milk, '2', '144')).toEqual({
      boxes: 2,
      grossCents: 14400,
      listPrice: 60000,
      netLineCents: 14400,
      netPerBoxCents: 7200,
      exceedsGross: false,
    })
  })

  test('worked example: 192 boxes of 12 for 77000.00', () => {
    const product = {
      ...milk,
      fixedDiscountPerPiece: 800,
      promotionPerPiece: 22800,
    }
    expect(rowOf(product, '192', '77000')).toEqual({
      boxes: 192,
      grossCents: 7_700_000,
      listPrice: 334201,
      netLineCents: 7_156_256,
      netPerBoxCents: 37272,
      exceedsGross: false,
    })
  })

  test('recalculates when the product discount or promotion change', () => {
    // Yoghurt: 3 boxes × 6 = 18 pieces; gross 100.00.
    const before = rowOf(yoghurt, '3', '100')
    // 18 × 1.5000 = 27.00 off.
    expect(before).toMatchObject({ netLineCents: 7300, netPerBoxCents: 2433 })
    const edited = {
      ...yoghurt,
      fixedDiscountPerPiece: 20000,
      promotionPerPiece: 0,
    }
    // 18 × 2.0000 = 36.00 off.
    expect(rowOf(edited, '3', '100')).toMatchObject({
      netLineCents: 6400,
      netPerBoxCents: 2133,
      exceedsGross: false,
    })
    expect(orderTotalCents([edited], draft({ yog: '3' }, { yog: '100' }))).toBe(
      6400,
    )
  })

  test('flags a discount above the gross cost and shows no negative cost', () => {
    // 18 × 1.5000 = 27.00 off a gross of 26.99.
    expect(rowOf(yoghurt, '3', '26.99')).toMatchObject({
      exceedsGross: true,
      netLineCents: 0,
      netPerBoxCents: 0,
    })
    expect(rowOf(yoghurt, '3', '27')).toMatchObject({ exceedsGross: false })
    expect(rowOf(yoghurt, '3', '')).toMatchObject({ exceedsGross: true })
  })

  test('unparsable or blank fields count as zero', () => {
    expect(rowOf(milk, 'x', '22')).toMatchObject({ boxes: 0, netLineCents: 0 })
    expect(rowOf(milk, '2', '')).toMatchObject({
      grossCents: 0,
      listPrice: 0,
      netLineCents: 0,
    })
    expect(rowOf(milk, '2', '1,5')).toMatchObject({ grossCents: 0 })
    expect(rowOf(milk, '2', '1.234')).toMatchObject({ grossCents: 0 })
  })
})

describe('rowWarnings', () => {
  const row = (boxes: number, netPerBoxCents: number) => ({
    boxes,
    netPerBoxCents,
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
  test('adds the net line costs of the supplier products', () => {
    expect(
      orderTotalCents(
        [milk, yoghurt],
        draft({ milk: '2', yog: '10' }, { milk: '144', yog: '300' }),
      ),
    ).toBe(14400 + 30000 - 9000) // yoghurt: 60 pieces × 1.5000 off
  })

  test('ignores blank, invalid and unknown rows', () => {
    expect(
      orderTotalCents([milk], draft({ milk: 'x', ghost: '5' }, { milk: '22' })),
    ).toBe(0)
  })
})

describe('orderInputFromDraft', () => {
  test('keeps rows with boxes, their gross cost, and trims the reference', () => {
    const parsed = orderInputFromDraft(
      draft({ milk: '3', yog: '' }, { milk: '220', yog: '9' }),
      [milk, yoghurt],
    )
    expect(parsed).toEqual({
      ok: true,
      value: {
        supplierId: 's1',
        warehouseId: 'w1',
        expectedOn: '2026-11-10',
        reference: 'P-1',
        lines: [{ productId: 'milk', boxes: 3, grossCostCents: 22000 }],
      },
    })
  })

  test('omits blank optional fields and sends a blank cost as zero', () => {
    const parsed = orderInputFromDraft(
      { ...draft({ milk: '1' }), expectedOn: '', reference: '  ' },
      [milk],
    )
    expect(parsed).toEqual({
      ok: true,
      value: {
        supplierId: 's1',
        warehouseId: 'w1',
        lines: [{ productId: 'milk', boxes: 1, grossCostCents: 0 }],
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
    expect(json).not.toContain('totalCost')
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

  test('names the product with invalid boxes or cost', () => {
    const boxes = orderInputFromDraft(draft({ milk: '1.5' }), [milk])
    expect(boxes.ok).toBe(false)
    if (!boxes.ok) expect(boxes.message).toContain('Leche 1L')
    const price = orderInputFromDraft(
      draft({ milk: '1' }, { milk: '1.23456' }),
      [milk],
    )
    expect(price).toEqual({
      ok: false,
      message: 'Leche 1L: Usa máximo 2 decimales.',
    })
  })

  test('rejects discount plus promotion above the typed gross cost', () => {
    const parsed = orderInputFromDraft(draft({ yog: '1' }, { yog: '8.99' }), [
      yoghurt,
    ])
    expect(parsed).toEqual({
      ok: false,
      message: `Yoghurt: ${NET_ABOVE_GROSS_MESSAGE}`,
    })
    expect(
      orderInputFromDraft(draft({ yog: '1' }, { yog: '9' }), [yoghurt]).ok,
    ).toBe(true)
  })

  test('ignores rows without boxes even when their price is wrong', () => {
    const parsed = orderInputFromDraft(
      draft({ milk: '1', yog: '0' }, { milk: '22', yog: 'abc' }),
      [milk, yoghurt],
    )
    expect(parsed.ok && parsed.value.lines).toEqual([
      { productId: 'milk', boxes: 1, grossCostCents: 2200 },
    ])
  })

  test('ignores boxes typed for products of another supplier', () => {
    const parsed = orderInputFromDraft(draft({ milk: '1', alp: '4' }), [
      milk,
      other,
    ])
    expect(parsed.ok && parsed.value.lines).toEqual([
      { productId: 'milk', boxes: 1, grossCostCents: 0 },
    ])
  })
})
