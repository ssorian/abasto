import { describe, expect, test } from 'bun:test'
import {
  costPerBoxCents,
  emptyRow,
  purchaseInputFromDraft,
  salePriceError,
  salePriceText,
} from '#/modules/inventory/lib/purchase-draft'
import type {
  PurchaseDraft,
  PurchaseEntryRow,
} from '#/modules/inventory/lib/purchase-draft'

/** Milk is bought by the box of 12; soda has only pieces. */
const products = [
  {
    id: 'milk',
    name: 'Leche 1L',
    presentations: [
      { id: 'milk-piece', factor: 1, isDefault: false },
      { id: 'milk-box', factor: 12, isDefault: true },
    ],
  },
  {
    id: 'soda',
    name: 'Refresco',
    presentations: [{ id: 'soda-piece', factor: 1, isDefault: true }],
  },
]

const row = (patch: Partial<PurchaseEntryRow>): PurchaseEntryRow => ({
  ...emptyRow(),
  ...patch,
})

function draft(rows: PurchaseDraft['rows']): PurchaseDraft {
  return {
    supplierId: 's1',
    warehouseId: 'w1',
    reference: ' F-100 ',
    purchasedOn: '2026-11-04',
    rows,
  }
}

/** Standard price per product for the receiving warehouse. */
const standard = { milk: 3400 }

describe('costPerBoxCents', () => {
  test('divides the whole-lot cost by the boxes', () => {
    expect(costPerBoxCents(row({ boxes: '2', cost: '60' }))).toBe(3000)
    expect(costPerBoxCents(row({ boxes: '3', cost: '100' }))).toBeCloseTo(
      3333.33,
      1,
    )
  })

  test('is null until boxes and cost are valid', () => {
    expect(costPerBoxCents(row({ boxes: '', cost: '60' }))).toBeNull()
    expect(costPerBoxCents(row({ boxes: '2', cost: '' }))).toBeNull()
    expect(costPerBoxCents(row({ boxes: '1.5', cost: '60' }))).toBeNull()
  })
})

describe('salePriceText', () => {
  test('prefills the standard price, then keeps what the user typed', () => {
    expect(salePriceText(row({ boxes: '2', cost: '60' }), 3400)).toBe('34.00')
    expect(
      salePriceText(row({ boxes: '2', cost: '60', salePrice: '36' }), 3400),
    ).toBe('36')
  })

  test('without a standard price, prefills the cost per box rounded up to the cent', () => {
    expect(salePriceText(row({ boxes: '3', cost: '100' }), null)).toBe('33.34')
    expect(salePriceText(row({ boxes: '', cost: '' }), null)).toBe('')
  })
})

describe('salePriceError', () => {
  test('accepts a price equal to or above the cost per box', () => {
    expect(salePriceError(row({ boxes: '2', cost: '60' }), 3000)).toBeNull()
    expect(salePriceError(row({ boxes: '2', cost: '60' }), 3400)).toBeNull()
  })

  test('rejects a price below the cost per box', () => {
    expect(
      salePriceError(row({ boxes: '2', cost: '68', salePrice: '33.99' }), 3399),
    ).toBe('El precio de salida no puede ser menor que el costo por caja.')
    // The standard price itself is below this lot's cost.
    expect(salePriceError(row({ boxes: '2', cost: '72' }), 3400)).toBe(
      'El precio de salida no puede ser menor que el costo por caja.',
    )
  })
})

describe('purchaseInputFromDraft', () => {
  test('sends only rows with boxes, in base units, with lot cost and sale price per box', () => {
    const parsed = purchaseInputFromDraft(
      draft({
        milk: row({
          boxes: '2',
          cost: '60',
          salePrice: '36',
          lotCode: ' L1 ',
          expiresOn: '2026-12-01',
        }),
        soda: row({}),
      }),
      products,
      standard,
    )
    expect(parsed).toEqual({
      ok: true,
      value: {
        supplierId: 's1',
        warehouseId: 'w1',
        reference: 'F-100',
        purchasedOn: '2026-11-04',
        lines: [
          {
            productId: 'milk',
            quantity: 24,
            totalCostCents: 6000,
            salePriceCents: 3600,
            lotCode: 'L1',
            expiresOn: '2026-12-01',
          },
        ],
      },
    })
  })

  test('an untouched sale price sends the prefilled standard price', () => {
    const parsed = purchaseInputFromDraft(
      draft({ milk: row({ boxes: '1', cost: '30' }) }),
      products,
      standard,
    )
    expect(parsed.ok && parsed.value.lines[0]).toEqual({
      productId: 'milk',
      quantity: 12,
      totalCostCents: 3000,
      salePriceCents: 3400,
    })
  })

  test('a product with pieces only counts each piece as a box', () => {
    const parsed = purchaseInputFromDraft(
      draft({ soda: row({ boxes: '10', cost: '70' }) }),
      products,
      {},
    )
    expect(parsed.ok && parsed.value.lines[0]).toMatchObject({
      productId: 'soda',
      quantity: 10,
      totalCostCents: 7000,
      salePriceCents: 700,
    })
  })

  test('a zero-cost lot is allowed', () => {
    const parsed = purchaseInputFromDraft(
      draft({ milk: row({ boxes: '1', cost: '0' }) }),
      products,
      standard,
    )
    expect(parsed.ok && parsed.value.lines[0].totalCostCents).toBe(0)
  })

  test.each([
    [{}, 'Selecciona el proveedor.', { supplierId: '' }],
    [{}, 'Selecciona el almacén.', { warehouseId: '' }],
    [{}, 'Indica la fecha de la compra.', { purchasedOn: '' }],
  ])('rejects a missing header field', (rows, message, header) => {
    expect(
      purchaseInputFromDraft({ ...draft(rows), ...header }, products, standard),
    ).toEqual({ ok: false, message })
  })

  test('rejects a purchase without boxes in any row', () => {
    expect(
      purchaseInputFromDraft(
        draft({ milk: row({ boxes: '0' }), soda: row({ cost: '5' }) }),
        products,
        standard,
      ),
    ).toEqual({
      ok: false,
      message: 'Escribe cuántas cajas llegaron de al menos un producto.',
    })
  })

  test.each(['1.5', '-2', 'dos'])('rejects boxes %p', (boxes) => {
    expect(
      purchaseInputFromDraft(
        draft({ milk: row({ boxes, cost: '30' }) }),
        products,
        standard,
      ),
    ).toEqual({
      ok: false,
      message: 'Leche 1L: las cajas deben ser un número entero.',
    })
  })

  test('rejects a row with boxes but no lot cost', () => {
    expect(
      purchaseInputFromDraft(
        draft({ milk: row({ boxes: '2' }) }),
        products,
        standard,
      ),
    ).toEqual({ ok: false, message: 'Leche 1L: Escribe un monto.' })
  })

  test('rejects a sale price below the cost per box', () => {
    expect(
      purchaseInputFromDraft(
        draft({ milk: row({ boxes: '2', cost: '68', salePrice: '33.99' }) }),
        products,
        standard,
      ),
    ).toEqual({
      ok: false,
      message:
        'Leche 1L: El precio de salida no puede ser menor que el costo por caja.',
    })
  })

  test('rejects an unreadable sale price', () => {
    expect(
      purchaseInputFromDraft(
        draft({ milk: row({ boxes: '2', cost: '60', salePrice: '3,40' }) }),
        products,
        standard,
      ),
    ).toEqual({
      ok: false,
      message: 'Leche 1L: Usa punto para los decimales, sin comas.',
    })
  })
})
