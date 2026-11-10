import { describe, expect, test } from 'bun:test'
import { buildSellable } from '#/modules/counter/lib/sellable'

const price = (
  presentationId: string,
  productId: string,
  priceCents: number | null,
  factor: number,
) => ({
  presentationId,
  productId,
  productName: productId === 'm' ? 'Leche' : 'Cola',
  presentationName: factor === 1 ? 'Pieza' : 'Caja',
  factor,
  priceCents,
})

describe('buildSellable', () => {
  test('lists priced presentations with whole presentations available', () => {
    const rows = buildSellable(
      [
        price('m1', 'm', 1000, 1),
        price('m12', 'm', 12000, 12),
        price('c1', 'c', null, 1),
      ],
      [{ productId: 'm', available: 30 }],
    )
    expect(rows).toEqual([
      {
        presentationId: 'm1',
        label: 'Leche · Pieza',
        priceCents: 1000,
        available: 30,
        productId: 'm',
        factor: 1,
        availableBase: 30,
      },
      {
        presentationId: 'm12',
        label: 'Leche · Caja',
        priceCents: 12000,
        available: 2,
        productId: 'm',
        factor: 12,
        availableBase: 30,
      },
    ])
  })

  test('a product without stock rows has nothing available', () => {
    expect(buildSellable([price('m1', 'm', 1000, 1)], [])[0]?.available).toBe(0)
  })
})
