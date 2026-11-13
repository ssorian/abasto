import { describe, expect, test } from 'bun:test'
import {
  changedPiecePrice,
  lineTotalCents,
  piecePriceIssue,
  piecePriceText,
} from '#/modules/inventory/lib/reception-price'
import {
  receptionInputFromDraft,
  receptionIssues,
  receptionTotals,
} from '#/modules/inventory/lib/reception-draft'
import type {
  ReceptionDraft,
  ReceptionLine,
} from '#/modules/inventory/lib/reception-draft'

/** 10 boxes of 12 at 1.2000 a piece, 0.0500 discount and 0.0300 promotion. */
const milk: ReceptionLine = {
  lineId: 'l1',
  productId: 'milk',
  orderedBoxes: 10,
  boxFactor: 12,
  price: {
    listPricePerPiece: 12000,
    fixedDiscountPerPiece: 500,
    promotionPerPiece: 300,
  },
}
/** 2 boxes of 24 at 0.8400, no discounts. */
const soda: ReceptionLine = {
  lineId: 'l2',
  productId: 'soda',
  orderedBoxes: 2,
  boxFactor: 24,
  price: {
    listPricePerPiece: 8400,
    fixedDiscountPerPiece: 0,
    promotionPerPiece: 0,
  },
}

const draft = (milkPrice?: string, sodaPrice?: string): ReceptionDraft => ({
  lines: {
    l1: {
      received: '10',
      damaged: '0',
      expiresOn: '',
      noExpiry: true,
      price: milkPrice,
    },
    l2: {
      received: '2',
      damaged: '0',
      expiresOn: '',
      noExpiry: true,
      price: sodaPrice,
    },
  },
  replacements: {},
})

describe('piecePriceText', () => {
  test('shows the stored price with 4 decimals', () => {
    expect(piecePriceText(milk)).toBe('1.2000')
  })
})

describe('lineTotalCents', () => {
  test('is the net line cost at the typed price, else the ordered one', () => {
    expect(lineTotalCents(milk, undefined)).toBe(13440)
    // 120 × 1.3000 = 156.00 − 120 × 0.0800 = 9.60.
    expect(lineTotalCents(milk, '1.3')).toBe(14640)
  })

  test('is null while the typed price is not valid', () => {
    expect(lineTotalCents(milk, 'abc')).toBeNull()
    expect(lineTotalCents(milk, '0.07')).toBeNull()
  })
})

describe('piecePriceIssue', () => {
  test('accepts the ordered price, an untouched field and a new valid price', () => {
    expect(piecePriceIssue(milk, undefined)).toBeNull()
    expect(piecePriceIssue(milk, '1.3500')).toBeNull()
  })

  test('asks for a price when the field is cleared', () => {
    expect(piecePriceIssue(milk, ' ')).toBe('Escribe el costo por pieza.')
  })

  test('reports malformed amounts with the money parser message', () => {
    expect(piecePriceIssue(milk, '1,30')).toBe(
      'Usa punto para los decimales, sin comas.',
    )
    expect(piecePriceIssue(milk, '1.30001')).toBe('Usa máximo 4 decimales.')
  })

  test('rejects a price below the discount and promotion', () => {
    expect(piecePriceIssue(milk, '0.0700')).toBe(
      'El descuento y la promoción no pueden superar el costo por pieza.',
    )
  })
})

describe('changedPiecePrice', () => {
  test('is the typed price only when it differs from the ordered one', () => {
    expect(changedPiecePrice(milk, undefined)).toBeUndefined()
    expect(changedPiecePrice(milk, '1.2')).toBeUndefined()
    expect(changedPiecePrice(milk, '1.3')).toBe(13000)
  })
})

describe('reception with prices', () => {
  test('a price issue is reported on its line', () => {
    expect(receptionIssues([milk, soda], draft('1,3'), {})).toEqual({
      l1: 'Usa punto para los decimales, sin comas.',
    })
  })

  test('totals use the typed prices', () => {
    expect(receptionTotals([milk, soda], draft('1.3'))).toEqual({
      totalCents: 14640 + 4032,
      changed: 1,
    })
    expect(receptionTotals([milk, soda], draft())).toEqual({
      totalCents: 13440 + 4032,
      changed: 0,
    })
  })

  test('sends only changed prices and the catalog choice when something changed', () => {
    const parsed = receptionInputFromDraft(
      'p1',
      [milk, soda],
      draft('1.3', '0.84'),
      {},
      { updateCatalogPrices: true },
    )
    expect(parsed).toEqual({
      ok: true,
      value: {
        purchaseId: 'p1',
        lines: [
          {
            lineId: 'l1',
            receivedBoxes: 10,
            damagedBoxes: 0,
            noExpiry: true,
            listPricePerPiece: 13000,
          },
          { lineId: 'l2', receivedBoxes: 2, damagedBoxes: 0, noExpiry: true },
        ],
        updateCatalogPrices: true,
      },
    })
    const unchanged = receptionInputFromDraft(
      'p1',
      [milk, soda],
      draft(),
      {},
      { updateCatalogPrices: true },
    )
    expect(unchanged.ok && 'updateCatalogPrices' in unchanged.value).toBe(false)
  })
})
