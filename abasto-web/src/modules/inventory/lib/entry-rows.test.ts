import { describe, expect, test } from 'bun:test'
import { entryRows } from '#/modules/inventory/lib/entry-rows'

const base = {
  quantity: 24,
  reason: 'Compra',
  reference: null,
  actorName: 'Laura',
  lotId: 'l1',
  lotCode: 'PED-0001',
  createdAt: new Date('2026-11-10T15:00:00Z'),
  productId: 'p1',
}

describe('entryRows', () => {
  test('keeps purchase movements only, mapped to what the table shows', () => {
    const rows = entryRows([
      { ...base, id: 'a', type: 'purchase' as const },
      { ...base, id: 'b', type: 'sale' as const },
    ])
    expect(rows).toEqual([
      {
        id: 'a',
        orderCode: 'PED-0001',
        productId: 'p1',
        quantity: 24,
        receivedBy: 'Laura',
        createdAt: '2026-11-10T15:00:00.000Z',
      },
    ])
  })
})
