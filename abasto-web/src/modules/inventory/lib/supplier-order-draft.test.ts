import { describe, expect, test } from 'bun:test'
import {
  NET_ABOVE_LIST_PRICE_MESSAGE,
  NO_LIST_PRICE_MESSAGE,
  NO_STANDARD_PRICE_MESSAGE,
  PRICE_BELOW_COST_MESSAGE,
  boxFactorOf,
  orderInputFromDraft,
  orderTotalCents,
  rowOf,
  rowWarnings,
  standardPriceOf,
  supplierProducts,
  unitCostOf,
} from '#/modules/inventory/lib/supplier-order-draft'
import type {
  OrderDraft,
  OrderProduct,
  StandardPrice,
} from '#/modules/inventory/lib/supplier-order-draft'

const presentations = (factor: number) => [
  { id: 'p', name: 'Caja', factor: 1, active: true, isDefault: false },
  { id: 'b', name: 'Caja', factor, active: true, isDefault: true },
]

/** Milk: 12 pieces at 5.0000; no discount. */
const milk: OrderProduct = {
  id: 'milk',
  name: 'Leche 1L',
  sku: 'LAL-001',
  supplierId: 's1',
  listPricePerPiece: 50000,
  fixedDiscountPerPiece: 0,
  promotionPerPiece: 0,
  presentations: presentations(12),
}
/** Yoghurt: 6 pieces at 5.5556 with 1.0000 discount and 0.5000 promotion per piece on the product. */
const yoghurt: OrderProduct = {
  ...milk,
  id: 'yog',
  name: 'Yoghurt',
  sku: 'LAL-005',
  listPricePerPiece: 55556,
  fixedDiscountPerPiece: 10000,
  promotionPerPiece: 5000,
  presentations: presentations(6),
}
const other: OrderProduct = { ...milk, id: 'alp', supplierId: 's2' }

const draft = (boxes: OrderDraft['boxes']): OrderDraft => ({
  supplierId: 's1',
  warehouseId: 'w1',
  expectedOn: '2026-11-10',
  reference: ' P-1 ',
  boxes,
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
  test('derives the row from the boxes and the catalog price, like the server', () => {
    // 2 boxes × 12 = 24 pieces at 5.0000; no discount.
    expect(rowOf(milk, '2')).toEqual({
      boxes: 2,
      grossCents: 12000,
      listPrice: 50000,
      netLineCents: 12000,
      netPerBoxCents: 6000,
      exceedsList: false,
    })
  })

  test('worked example: 192 boxes of 12 at 33.4201 a piece', () => {
    const product = {
      ...milk,
      listPricePerPiece: 334201,
      fixedDiscountPerPiece: 800,
      promotionPerPiece: 22800,
    }
    expect(rowOf(product, '192')).toEqual({
      boxes: 192,
      grossCents: 7_699_991,
      listPrice: 334201,
      netLineCents: 7_156_247,
      netPerBoxCents: 37272,
      exceedsList: false,
    })
  })

  test('recalculates when the product price, discount or promotion change', () => {
    // Yoghurt: 3 boxes × 6 = 18 pieces at 5.5556 less 1.5000 each.
    const before = rowOf(yoghurt, '3')
    expect(before).toMatchObject({ grossCents: 10000, netLineCents: 7300 })
    const edited = {
      ...yoghurt,
      fixedDiscountPerPiece: 20000,
      promotionPerPiece: 0,
    }
    // 18 × 2.0000 = 36.00 off.
    expect(rowOf(edited, '3')).toMatchObject({
      netLineCents: 6400,
      netPerBoxCents: 2133,
      exceedsList: false,
    })
    expect(orderTotalCents([edited], draft({ yog: '3' }))).toBe(6400)
  })

  test('flags a discount above the list price and shows no negative cost', () => {
    const above = { ...yoghurt, listPricePerPiece: 14000 }
    expect(rowOf(above, '3')).toMatchObject({
      exceedsList: true,
      netLineCents: 0,
      netPerBoxCents: 0,
    })
    expect(rowOf({ ...above, listPricePerPiece: 15000 }, '3')).toMatchObject({
      exceedsList: false,
    })
    expect(rowOf({ ...yoghurt, listPricePerPiece: 0 }, '3')).toMatchObject({
      exceedsList: true,
    })
  })

  test('unparsable or blank boxes cost nothing', () => {
    expect(rowOf(milk, 'x')).toMatchObject({ boxes: 0, netLineCents: 0 })
    expect(rowOf(yoghurt, '')).toMatchObject({
      boxes: 0,
      netLineCents: 0,
      exceedsList: false,
    })
  })
})

describe('rowWarnings', () => {
  const row = (boxes: number, netPerBoxCents: number, listPrice = 50000) => ({
    boxes,
    netPerBoxCents,
    listPrice,
  })
  const known = (priceCents: number): StandardPrice => ({
    state: 'known',
    priceCents,
  })

  test('texts are exact', () => {
    expect(PRICE_BELOW_COST_MESSAGE).toBe(
      'El costo por caja supera el precio estándar. Actualiza el precio estándar del producto en el catálogo.',
    )
    expect(NO_STANDARD_PRICE_MESSAGE).toBe(
      'Sin precio estándar en este almacén',
    )
    expect(NO_LIST_PRICE_MESSAGE).toBe('Sin costo por pieza')
  })

  test('warns when the cost per box exceeds the standard price', () => {
    expect(rowWarnings(row(2, 25001), known(25000))).toEqual([
      PRICE_BELOW_COST_MESSAGE,
    ])
  })

  test('warns with its own text when there is no standard price after loading', () => {
    expect(rowWarnings(row(1, 100), { state: 'missing' })).toEqual([
      NO_STANDARD_PRICE_MESSAGE,
    ])
  })

  test('is quiet while the standard prices are still loading', () => {
    expect(rowWarnings(row(1, 100), { state: 'loading' })).toEqual([])
    expect(rowWarnings(row(3, 99999), { state: 'loading' })).toEqual([])
  })

  test('is quiet when the standard price covers the cost', () => {
    expect(rowWarnings(row(1, 26400), known(26400))).toEqual([])
    expect(rowWarnings(row(1, 26400), known(30000))).toEqual([])
  })

  test('is quiet on rows without boxes for standard price warnings', () => {
    expect(rowWarnings(row(0, 99999), known(100))).toEqual([])
    expect(rowWarnings(row(0, 99999), { state: 'missing' })).toEqual([])
  })

  test('warns about a missing list price even without boxes, first', () => {
    expect(rowWarnings(row(0, 0, 0), { state: 'loading' })).toEqual([
      NO_LIST_PRICE_MESSAGE,
    ])
    expect(rowWarnings(row(1, 0, 0), { state: 'missing' })).toEqual([
      NO_LIST_PRICE_MESSAGE,
      NO_STANDARD_PRICE_MESSAGE,
    ])
  })
})

describe('standardPriceOf', () => {
  test('is loading until the prices arrive, then known or missing', () => {
    expect(standardPriceOf(undefined, 'milk')).toEqual({ state: 'loading' })
    expect(standardPriceOf({ milk: 26400 }, 'milk')).toEqual({
      state: 'known',
      priceCents: 26400,
    })
    expect(standardPriceOf({ milk: 26400 }, 'yog')).toEqual({
      state: 'missing',
    })
    expect(standardPriceOf({}, 'milk')).toEqual({ state: 'missing' })
  })
})

describe('unitCostOf', () => {
  test('net cost per piece and per box regardless of boxes', () => {
    // Yoghurt: 5.5556 − 1.0000 − 0.5000 = 4.0556 a piece; × 6 = 24.3336 → 2433 cents.
    expect(unitCostOf(yoghurt)).toEqual({
      netPerPiece: 40556,
      netPerBoxCents: 2433,
    })
    expect(unitCostOf(milk)).toEqual({
      netPerPiece: 50000,
      netPerBoxCents: 6000,
    })
  })

  test('shows no negative cost when the discounts exceed the price', () => {
    expect(unitCostOf({ ...yoghurt, listPricePerPiece: 14000 })).toEqual({
      netPerPiece: 0,
      netPerBoxCents: 0,
    })
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
      orderTotalCents([milk, yoghurt], draft({ milk: '2', yog: '10' })),
    ).toBe(12000 + 33334 - 9000) // yoghurt: 60 pieces × 5.5556 less 1.5000 each
  })

  test('ignores blank, invalid and unknown rows', () => {
    expect(orderTotalCents([milk], draft({ milk: 'x', ghost: '5' }))).toBe(0)
  })
})

describe('orderInputFromDraft', () => {
  test('keeps rows with boxes only and trims the reference', () => {
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

  test('never sends costs, discounts, promotions or totals: the server takes them from the catalog', () => {
    const parsed = orderInputFromDraft(draft({ yog: '1' }), [yoghurt])
    const json = JSON.stringify(parsed)
    expect(json).not.toContain('gross')
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

  test('names the product with invalid boxes', () => {
    const boxes = orderInputFromDraft(draft({ milk: '1.5' }), [milk])
    expect(boxes.ok).toBe(false)
    if (!boxes.ok) expect(boxes.message).toContain('Leche 1L')
  })

  test('rejects discount plus promotion above the list price', () => {
    const above = { ...yoghurt, listPricePerPiece: 14000 }
    expect(orderInputFromDraft(draft({ yog: '1' }), [above])).toEqual({
      ok: false,
      message: `Yoghurt: ${NET_ABOVE_LIST_PRICE_MESSAGE}`,
    })
    expect(
      orderInputFromDraft(draft({ yog: '1' }), [
        { ...yoghurt, listPricePerPiece: 15000 },
      ]).ok,
    ).toBe(true)
  })

  test('ignores rows without boxes even when their catalog price is wrong', () => {
    const parsed = orderInputFromDraft(draft({ milk: '1', yog: '0' }), [
      milk,
      { ...yoghurt, listPricePerPiece: 0 },
    ])
    expect(parsed.ok && parsed.value.lines).toEqual([
      { productId: 'milk', boxes: 1 },
    ])
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
