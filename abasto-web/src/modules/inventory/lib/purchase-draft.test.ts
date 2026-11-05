import { describe, expect, test } from 'bun:test'
import {
  emptyLine,
  purchaseInputFromDraft,
} from '#/modules/inventory/lib/purchase-draft'
import type { PurchaseDraft } from '#/modules/inventory/lib/purchase-draft'

const products = [
  {
    id: 'p1',
    presentations: [
      { id: 'p1-piece', factor: 1 },
      { id: 'p1-box', factor: 24 },
    ],
  },
]

function draft(overrides: Partial<PurchaseDraft> = {}): PurchaseDraft {
  return {
    supplierId: 's1',
    warehouseId: 'w1',
    reference: ' F-100 ',
    purchasedOn: '2026-11-04',
    lines: [
      {
        ...emptyLine('a'),
        productId: 'p1',
        presentationId: 'p1-box',
        packs: '3',
        loose: '5',
        cost: '1234.56',
        lotCode: ' L1 ',
        expiresOn: '2026-12-01',
      },
    ],
    ...overrides,
  }
}

describe('purchaseInputFromDraft', () => {
  test('converts packs to base units and pesos to cents', () => {
    expect(purchaseInputFromDraft(draft(), products)).toEqual({
      ok: true,
      value: {
        supplierId: 's1',
        warehouseId: 'w1',
        reference: 'F-100',
        purchasedOn: '2026-11-04',
        lines: [
          {
            productId: 'p1',
            quantity: 77,
            totalCostCents: 123456,
            lotCode: 'L1',
            expiresOn: '2026-12-01',
          },
        ],
      },
    })
  })

  test('omits blank optional fields', () => {
    const base = draft()
    const result = purchaseInputFromDraft(
      draft({
        reference: '',
        lines: [{ ...base.lines[0], lotCode: '', expiresOn: '' }],
      }),
      products,
    )
    expect(result.ok && result.value.reference).toBeUndefined()
    expect(result.ok && result.value.lines[0]).toEqual({
      productId: 'p1',
      quantity: 77,
      totalCostCents: 123456,
    })
  })

  test('requires supplier, warehouse, date and lines', () => {
    const messages = [
      [draft({ supplierId: '' }), 'Selecciona el proveedor.'],
      [draft({ warehouseId: '' }), 'Selecciona el almacén.'],
      [draft({ purchasedOn: '' }), 'Indica la fecha de la compra.'],
      [draft({ lines: [] }), 'Agrega al menos un producto a la compra.'],
    ] as const
    for (const [input, message] of messages) {
      expect(purchaseInputFromDraft(input, products)).toEqual({
        ok: false,
        message,
      })
    }
  })

  test('names the offending line', () => {
    const base = draft().lines[0]
    const bad = (patch: Partial<typeof base>) =>
      purchaseInputFromDraft(
        draft({ lines: [base, { ...base, key: 'b', ...patch }] }),
        products,
      )
    expect(bad({ productId: '' })).toEqual({
      ok: false,
      message: 'Línea 2: selecciona el producto.',
    })
    expect(bad({ presentationId: 'other' })).toEqual({
      ok: false,
      message: 'Línea 2: selecciona la presentación.',
    })
    expect(bad({ packs: '', loose: '' })).toEqual({
      ok: false,
      message: 'Línea 2: La cantidad debe ser mayor que cero.',
    })
    expect(bad({ cost: '10.123' })).toEqual({
      ok: false,
      message: 'Línea 2: Usa máximo 2 decimales.',
    })
    expect(bad({ cost: '' }).ok).toBe(false)
  })

  test('allows a zero cost', () => {
    const base = draft().lines[0]
    const result = purchaseInputFromDraft(
      draft({ lines: [{ ...base, cost: '0' }] }),
      products,
    )
    expect(result.ok && result.value.lines[0].totalCostCents).toBe(0)
  })
})
