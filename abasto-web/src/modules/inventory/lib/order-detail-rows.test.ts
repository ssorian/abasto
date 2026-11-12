import { describe, expect, test } from 'bun:test'
import {
  orderDetailNotes,
  orderDetailRow,
} from '#/modules/inventory/lib/order-detail-rows'
import type { SupplierOrder } from '#/modules/inventory/services/supplier-orders'

type Line = SupplierOrder['lines'][number]

/** 10 boxes of 12 received 8 good, 1 damaged, 1 missing, charged as ordered. */
const base: Line = {
  id: 'l1',
  productId: 'p1',
  productName: 'Leche',
  sku: 'LEC-1',
  boxFactor: 12,
  boxes: 10,
  quantity: 120,
  grossCostCents: 17_280,
  listPricePerPiece: 12_000,
  orderedListPricePerPiece: 12_000,
  ordered: true,
  fixedDiscountPerPiece: 0,
  promotionPerPiece: 0,
  totalCostCents: 17_280,
  costPerBoxCents: 1_728,
  goodQuantity: 96,
  damagedQuantity: 12,
  missingQuantity: 12,
  lotCode: 'PED-0001',
  expiresOn: null,
}

describe('orderDetailRow', () => {
  test('unchanged line shows boxes and no ordered price', () => {
    const row = orderDetailRow(base)
    expect(row).toMatchObject({
      id: 'l1',
      productName: 'Leche',
      sku: 'LEC-1',
      ordered: true,
      orderedBoxes: 10,
      goodBoxes: 8,
      damagedBoxes: 1,
      missingBoxes: 1,
      pricePerPieceText: '1.2000',
      orderedPriceText: null,
      priceDelta: null,
      totalCents: 17_280,
    })
  })

  test('repriced up and down expose the ordered price and direction', () => {
    const up = orderDetailRow({ ...base, listPricePerPiece: 13_000 })
    expect(up.orderedPriceText).toBe('1.2000')
    expect(up.pricePerPieceText).toBe('1.3000')
    expect(up.priceDelta).toBe('up')
    const down = orderDetailRow({ ...base, listPricePerPiece: 11_000 })
    expect(down.orderedPriceText).toBe('1.2000')
    expect(down.priceDelta).toBe('down')
  })

  test('unordered line has no ordered boxes nor ordered price', () => {
    const row = orderDetailRow({
      ...base,
      ordered: false,
      orderedListPricePerPiece: 9_000,
      goodQuantity: 120,
      damagedQuantity: 0,
      missingQuantity: 0,
    })
    expect(row.ordered).toBe(false)
    expect(row.orderedBoxes).toBeNull()
    expect(row.orderedPriceText).toBeNull()
    expect(row.priceDelta).toBeNull()
    expect(row.goodBoxes).toBe(10)
  })

  test('line added at reception with null ordered price shows no difference', () => {
    const row = orderDetailRow({ ...base, orderedListPricePerPiece: null })
    expect(row.orderedPriceText).toBeNull()
    expect(row.priceDelta).toBeNull()
  })

  test('unreceived line has no received boxes', () => {
    const row = orderDetailRow({
      ...base,
      goodQuantity: null,
      damagedQuantity: null,
      missingQuantity: null,
    })
    expect(row.orderedBoxes).toBe(10)
    expect(row.goodBoxes).toBeNull()
    expect(row.missingBoxes).toBeNull()
    expect(row.damagedBoxes).toBeNull()
  })
})

describe('orderDetailNotes', () => {
  test('counts repriced and unordered lines', () => {
    const order = {
      lines: [
        base,
        { ...base, id: 'l2', listPricePerPiece: 13_000 },
        { ...base, id: 'l3', ordered: false },
        { ...base, id: 'l4', listPricePerPiece: 11_000 },
      ],
    }
    expect(orderDetailNotes(order)).toEqual({ repriced: 2, unordered: 1 })
  })
})
